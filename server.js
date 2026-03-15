const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "concierge"
});

db.connect((err) => {
  if (err) {
    console.log("Erro ao conectar no banco:", err);
  } else {
    console.log("Conectado ao MySQL");
  }
});


// cadastro
app.post("/register", (req, res) => {

  const { email, password } = req.body;

  const sql = "INSERT INTO users (email, password) VALUES (?, ?)";

  db.query(sql, [email, password], (err, result) => {

    if (err) {
      return res.status(500).json({ message: "Erro ao cadastrar" });
    }

    res.json({ message: "Usuário cadastrado com sucesso" });

  });

});


// login
app.post("/login", (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, result) => {

    if (err) {
      return res.status(500).json({ message: "Erro no servidor" });
    }

    if (result.length > 0) {
      res.json({ message: "Login realizado com sucesso" });
    } else {
      res.status(401).json({ message: "Email ou senha inválidos" });
    }

  });

});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});