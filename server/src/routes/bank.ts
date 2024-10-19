import express from "express";
import { getLogger } from "@/utils/loggers";
import { pool } from "@/db";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";

const router = express.Router();
const logger = getLogger("BANK_ROUTE");

// Create an account
router.post("/account", async (req, res) => {

  const { name, balance } = req.body;
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO bank_account (name, balance) VALUES (?, ?)",
      [name, balance]
    );
    res.status(201).json({ id: result.insertId, name, balance });
  } catch (error) {
    logger.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Get account details
router.get("/account/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT * FROM bank_account WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.status(200).json(rows[0]);
    }
  } catch (error) {
    logger.error("Error fetching account:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

// Deposit money
router.post("/account/:id/deposit", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const amount = parseFloat(req.body.amount);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid account ID" });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE bank_account SET balance = balance + ? WHERE id = ?",
      [amount, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Account not found" });
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT name, balance FROM bank_account WHERE id = ?",
      [id]
    );

    await connection.execute(
      "INSERT INTO bank_catalog (name, balance, action, amount) VALUES (?, ?, 'deposit', ?)",
      [rows[0].name, rows[0].balance, amount]
    );

    await connection.commit();
    res.status(200).json({ newBalance: rows[0].balance });
  } catch (error) {
    await connection.rollback();
    logger.error("Error depositing money:", error);
    res.status(500).json({ error: "Failed to deposit money" });
  } finally {
    connection.release();
  }
});

// Withdraw money
router.post("/account/:id/withdraw", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const amount = parseFloat(req.body.amount);
  
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid account ID" });
  }

  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      "UPDATE bank_account SET balance = balance - ? WHERE id = ? AND balance - ? >= 0",
      [amount, id, amount]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Account not found or insufficient funds" });
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT name, balance FROM bank_account WHERE id = ?",
      [id]
    );

    await connection.execute(
      "INSERT INTO bank_catalog (name, balance, action, amount) VALUES (?, ?, 'withdrawal', ?)",
      [rows[0].name, rows[0].balance, amount]
    );

    await connection.commit();
    res.status(200).json({ newBalance: rows[0].balance });
  } catch (error) {
    await connection.rollback();
    logger.error("Error withdrawing money:", error);
    res.status(500).json({ error: "Failed to withdraw money" });
  } finally {
    connection.release();
  }
});

// Transfer money
router.post("/transfer", async (req, res) => {
  const { fromId, toId, amount } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Update 'from' account
    const [fromResult] = await connection.execute<ResultSetHeader>(
      "UPDATE bank_account SET balance = balance - ? WHERE id = ? AND balance - ? >= 0",
      [amount, fromId, amount]
    );

    if (fromResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Source account not found or insufficient funds" });
    }

    // Update 'to' account
    const [toResult] = await connection.execute<ResultSetHeader>(
      "UPDATE bank_account SET balance = balance + ? WHERE id = ?",
      [amount, toId]
    );

    if (toResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Destination account not found" });
    }

    // Get updated balances
    const [fromRows] = await connection.execute<RowDataPacket[]>(
      "SELECT name, balance FROM bank_account WHERE id = ?",
      [fromId]
    );
    const [toRows] = await connection.execute<RowDataPacket[]>(
      "SELECT name, balance FROM bank_account WHERE id = ?",
      [toId]
    );

    // Log transactions
    await connection.execute(
      "INSERT INTO bank_catalog (name, balance, action, amount) VALUES (?, ?, 'withdrawal', ?)",
      [fromRows[0].name, fromRows[0].balance, amount]
    );
    await connection.execute(
      "INSERT INTO bank_catalog (name, balance, action, amount) VALUES (?, ?, 'deposit', ?)",
      [toRows[0].name, toRows[0].balance, amount]
    );

    await connection.commit();
    res.status(200).json({ fromBalance: fromRows[0].balance, toBalance: toRows[0].balance });
  } catch (error) {
    await connection.rollback();
    logger.error("Error transferring money:", error);
    res.status(500).json({ error: "Failed to transfer money" });
  } finally {
    connection.release();
  }
});

export default router;
