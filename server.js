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

function formatToMySQLDateTime(dataBR) {
  if (!dataBR) return null;

  try {
    const [datePart, timePart] = dataBR.split(' ');

    if (!datePart || !timePart) return null;

    const [day, month, year] = datePart.split('/');
    const [hour, minute] = timePart.split(':');

    if (!day || !month || !year || !hour || !minute) return null;

    return `${year}-${month}-${day} ${hour}:${minute}:00`;
  } catch (e) {
    console.error('Erro ao converter data:', dataBR);
    return null;
  }
}


// cadastro
app.post("/register", (req, res) => {

  const {user, email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ? ";

  db.query(query, [ email ], (err, result) => {


    if (result.length > 0) {

      res.json({ message: "Já existe esse email cadastrado!" });

    } else {

      const sql = "INSERT INTO users (user, email, password) VALUES (?, ?, ?)";

      db.query(sql, [user, email, password], (err, result) => {

        if (err) {
          return res.status(500).json({ message: "Erro ao cadastrar" });
        }


        res.json({ message: "Usuário cadastrado com sucesso!" });

      });

    }

  });


});

// cadastro Visitantes
app.post("/visitors", (req, res) => {

  const {
    cpf_cnpj,
    nome,
    empresa,
    data_entrada,
    data_saida,
    placa,
    destino,
    atendente,
    obs
  } = req.body;

    const dataEntradaMySQL = formatToMySQLDateTime(data_entrada);
    const dataSaidaMySQL = formatToMySQLDateTime(data_saida);

   // res.json({ message: dataEntradaMySQL + dataEntradaMySQL});

  const sql = `
    INSERT INTO visitors 
    (cpf_cnpj, nome, empresa, data_entrada, data_saida, placa, destino, atendente, obs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [cpf_cnpj, nome, empresa, dataEntradaMySQL, dataSaidaMySQL, placa, destino, atendente, obs],
    (err, result) => {

      if (err) {
        console.error(err);
        console.log('BODY COMPLETO:', req.body);
        return res.status(500).json({ message: "Erro ao cadastrar visitante" });
      }
   
     res.json({ message: "Visitante cadastrado com sucesso!"});
    }
  );
});




// login
app.post("/login", (req, res) => {

  const { user, email, password } = req.body;

  const sql = "SELECT * FROM users WHERE user = ? and email = ? AND password = ?";

  db.query(sql, [user, email, password], (err, result) => {

    if (err) {
      return res.status(500).json({ message: "Erro no servidor" });
    }

    if (result.length > 0) {
      res.json({ result});
    } else {
      res.status(401).json({ message: "Email ou senha inválidos" });
    }

  });

});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});