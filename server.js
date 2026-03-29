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


function formatToMySQLDate(dataBR) {
  if (!dataBR) return null;

  try {
    const [datePart, timePart] = dataBR.split(' ');

    if (!datePart || !timePart) return null;

    const [day, month, year] = datePart.split('/');
    const [hour, minute] = timePart.split(':');

    if (!day || !month || !year || !hour || !minute) return null;

    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Erro ao converter data:', dataBR);
    return null;
  }
}


// cadastro
app.post("/register", (req, res) => {

  const { user, email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ? ";

  db.query(query, [email], (err, result) => {


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
    obs,
    local
  } = req.body;

  const dataEntradaMySQL = formatToMySQLDateTime(data_entrada);
  const dataSaidaMySQL = formatToMySQLDateTime(data_saida);

  // res.json({ message: dataEntradaMySQL + dataEntradaMySQL});

  const sql = `
    INSERT INTO visitors 
    (cpf_cnpj, nome, empresa, data_entrada, data_saida, placa, destino, atendente, obs, local)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [cpf_cnpj, nome, empresa, dataEntradaMySQL, dataSaidaMySQL, placa, destino, atendente, obs, local],
    (err, result) => {

      if (err) {
        console.error(err);
        console.log('BODY COMPLETO:', req.body);
        return res.status(500).json({ message: "Erro ao cadastrar visitante" });
      }

      res.json({ message: "Visitante cadastrado com sucesso!" });
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
      res.json({ result });
    } else {
      res.status(401).json({ message: "Email ou senha inválidos" });
    }

  });

});

// Rota para buscar todos os visitantes
app.get("/visitantes", (req, res) => {
  const { data_atual } = req.query; // recebe ?data_atual=2026-03-28

  let sql = `
    SELECT id, cpf_cnpj, nome, empresa,
           DATE_FORMAT(data_entrada, '%d/%m/%Y %H:%i') as data_entrada,
           DATE_FORMAT(data_saida, '%d/%m/%Y %H:%i') as data_saida,
           placa, destino, atendente, obs, outros
    FROM visitors
  `;


  // Se passar data_atual, filtra pelo dia
  if (data_atual) {
    // Espera-se data_atual no formato YYYY-MM-DD
    sql += ` WHERE data_registro = ?`;
  }

  db.query(sql, data_atual ? [data_atual] : [], (err, result) => {
    if (err) {
      console.error("Erro ao buscar visitantes:", err);
      return res.status(500).json({ message: "Erro no servidor" });
    }

    res.json(result);
  });
});



app.patch('/visitantes/:id', (req, res) => {
  const id = Number(req.params.id);
  const { data_entrada, data_saida } = req.body;

  const dataEntradaMySQL = formatToMySQLDateTime(data_entrada);
  const dataSaidaMySQL = formatToMySQLDateTime(data_saida);

  // Valida que pelo menos um campo veio
  if (!data_entrada && !data_saida) {
    return res.status(400).json({ message: "Nenhum campo para atualizar" });
  }


  // Monta query dinamicamente
  const updates = [];
  const values = [];

  if (data_entrada !== undefined) {
    updates.push('data_entrada = ?');
    values.push(dataEntradaMySQL);
  }

  if (data_saida !== undefined) {
    updates.push('data_saida = ?');
    values.push(dataSaidaMySQL);
  }

  // Adiciona o id no final
  values.push(id);

  const sql = `UPDATE visitors SET ${updates.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro no servidor" });
    }

    if (result.affectedRows > 0) {
      res.json({ message: "Registro atualizado com sucesso" });
    } else {
      res.status(404).json({ message: "Registro não encontrado" });
    }
  });
});


app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});


