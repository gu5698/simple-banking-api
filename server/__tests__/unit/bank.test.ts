import request from 'supertest';
import express from 'express';
import router from '../../src/routes/bank';
import { pool } from '../../src/db';

jest.mock('../../src/db', () => ({
  pool: {
    execute: jest.fn(),
    getConnection: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use(router);

describe('Bank operations', () => {
  let mockConnection: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection = {
      beginTransaction: jest.fn(),
      execute: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    (pool.getConnection as jest.Mock).mockResolvedValue(mockConnection);
  });

  test('POST /account should create a new account', async () => {
    const mockInsertId = 1;
    (pool.execute as jest.Mock).mockResolvedValueOnce([{ insertId: mockInsertId }]);

    const response = await request(app)
      .post('/account')
      .send({ name: 'John Doe', balance: 1000 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: mockInsertId, name: 'John Doe', balance: 1000 });
    expect(pool.execute).toHaveBeenCalledWith(
      "INSERT INTO bank_account (name, balance) VALUES (?, ?)",
      ['John Doe', 1000]
    );
  });

  test('GET /account/:id should return account details', async () => {
    const mockAccount = { id: 1, name: 'John Doe', balance: 1000 };
    (pool.execute as jest.Mock).mockResolvedValueOnce([[mockAccount]]);

    const response = await request(app).get('/account/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockAccount);
    expect(pool.execute).toHaveBeenCalledWith(
      "SELECT * FROM bank_account WHERE id = ?",
      ['1']
    );
  });

  test('POST /account/:id/deposit should increase account balance', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ name: 'John Doe', balance: 1500 }]]);

    const response = await request(app)
      .post('/account/1/deposit')
      .send({ amount: 500 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ newBalance: 1500 });
    expect(mockConnection.execute).toHaveBeenCalledTimes(3);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test('POST /account/:id/withdraw should decrease account balance', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ name: 'John Doe', balance: 500 }]]);

    const response = await request(app)
      .post('/account/1/withdraw')
      .send({ amount: 500 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ newBalance: 500 });
    expect(mockConnection.execute).toHaveBeenCalledTimes(3);
    expect(mockConnection.commit).toHaveBeenCalled();
  });

  test('POST /transfer should transfer money between accounts', async () => {
    mockConnection.execute
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ name: 'John Doe', balance: 500 }]])
      .mockResolvedValueOnce([[{ name: 'Jane Doe', balance: 1500 }]]);

    const response = await request(app)
      .post('/transfer')
      .send({ fromId: 1, toId: 2, amount: 500 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ fromBalance: 500, toBalance: 1500 });
    expect(mockConnection.execute).toHaveBeenCalledTimes(6);
    expect(mockConnection.commit).toHaveBeenCalled();
  });
});
