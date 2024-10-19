import express from "express";
import bankRouter from "./bank";

export default function (app: express.Application) {
  // 設置 api bank 路由
  app.use("/bank", bankRouter);
}
