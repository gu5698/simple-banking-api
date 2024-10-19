import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import express from 'express';
import bankRouter from '../../src/routes/bank';
import { pool } from '../../src/db';

const app = express();
app.use(express.json());
app.use('/bank', bankRouter);

describe('Bank API', () => {
  beforeAll(async () => {
    try {
      const connection = await pool.getConnection();
      await connection.query('USE meepshop_bank');
      console.log('Successfully connected to the test database');
      connection.release();
    } catch (error) {
      console.error('Failed to connect to the test database:', error);
    }
  });

  afterAll(async () => {
    // Clean up test database
    await pool.end();
  });

  test('POST /bank/account should create a new account', async () => {
    const response = await request(app)
      .post('/bank/account')
      .send({ name: 'Test User', balance: 1000 });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test User');
    expect(response.body.balance).toBe(1000);

    // 验证数据库中的数据
    const result = await pool.query('SELECT * FROM bank_account WHERE id = ?', [response.body.id]);
    const [rows] = result;
    expect(rows).toHaveLength(1);
    expect(rows).toMatchObject([{
      id: response.body.id,
      name: 'Test User',
      balance: 1000
    }]);
  });

  test('GET /bank/account/:id should return account details', async () => {
    // 首先创建一个账户
    const createResponse = await request(app)
      .post('/bank/account')
      .send({ name: 'Jane Doe', balance: 2000 });

    const accountId = createResponse.body.id;

    // 然后获取账户详情
    const getResponse = await request(app)
      .get(`/bank/account/${accountId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: accountId,
      name: 'Jane Doe',
      balance: 2000
    });
  });

  test('POST /bank/account/:id/deposit should deposit money', async () => {
    // Assume we have an account with id 1
    const response = await request(app)
      .post('/bank/account/1/deposit')
      .send({ amount: 500 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('newBalance');
  });

  test('POST /bank/account/:id/withdraw should withdraw money', async () => {
    // Assume we have an account with id 1 and sufficient balance
    const response = await request(app)
      .post('/bank/account/1/withdraw')
      .send({ amount: 200 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('newBalance');
  });

  test('POST /bank/transfer should transfer money between accounts', async () => {
    // Assume we have accounts with id 1 and 2
    const response = await request(app)
      .post('/bank/transfer')
      .send({ fromId: 1, toId: 2, amount: 300 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('fromBalance');
    expect(response.body).toHaveProperty('toBalance');
  });
});

