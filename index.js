require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const sha = require("sha256");
const cors = require("cors");
const session = require("express-session");
const path = require("path");

app.use(express.static(path.join(__dirname, "build")));

app.use(
  session({
    secret: process.env.SESSION_NO,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const URL = process.env.MONGODB_URL;

let mydb;
mongoose
  .connect(URL, { dbName: "db2" })
  .then(() => {
    console.log("MongoDB에 연결");
    mydb = mongoose.connection.db;
  })
  .catch((err) => {
    console.log("MongoDB 연결 실패: ", err);
  });

app.post("/signup", async (req, res) => {
  try {
    await mydb.collection("account").insertOne({
      userId: req.body.userId,
      userPw: sha(req.body.userPw),
      userGroup: req.body.userGroup,
      userEmail: req.body.userEmail,
    });

    console.log("회원가입 성공");
    res.json({ message: "회원가입 성공" });
  } catch (err) {
    console.log("회원가입 에러: ", err);
    res.status(500).send({ error: err });
  }
});

const checkUserSession = (req, res) => {
  if (req.session.user) {
    console.log("세션 유지");
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
};

app.get("/login", checkUserSession);
app.get("/", checkUserSession);

app.post("/login", async (req, res) => {
  const { userId, userPw } = req.body;

  try {
    const result = await mydb.collection("account").findOne({ userId });

    if (!result) {
      return res.json({ err: "아이디를 찾을 수 없습니다" });
    } else if (result.userPw && result.userPw === sha(userPw)) {
      req.session.user = { userId, userPw };
      console.log("새로운 로그인");
      res.json({ user: req.session.user });
    } else {
      return res.json({ err: "비밀번호가 틀렸습니다" });
    }
  } catch (err) {
    console.log("로그인 에러 : ", err);
    res.status(500).json({ err: "서버 오류" });
  }
});

app.get("/logout", (req, res) => {
  console.log("로그아웃");
  req.session.destroy();

  res.json({ user: null });
});

app.listen(PORT, () => {
  console.log("8080번 포트에서 실행 중");
});
