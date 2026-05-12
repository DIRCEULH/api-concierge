const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
  host: "",
  user: "",
  password: "",
  database: ""
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
    local,
    codigo_tipo
  } = req.body;

  // 🔥 validação de datas
  const dataEntradaMySQL =
    data_entrada && data_entrada !== "" && data_entrada !== "00/00/0000"
      ? formatToMySQLDateTime(data_entrada)
      : null;

  const dataSaidaMySQL =
    data_saida && data_saida !== "" && data_saida !== "00/00/0000"
      ? formatToMySQLDateTime(data_saida)
      : null;

  const sql = `
    INSERT INTO visitors
    (cpf_cnpj, nome, empresa, data_entrada, data_saida, placa, destino, atendente, obs, local, tipo_visitante)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      cpf_cnpj,
      nome,
      empresa,
      dataEntradaMySQL,
      dataSaidaMySQL,
      placa,
      destino,
      atendente,
      obs,
      local,
      codigo_tipo

    ],
    (err, result) => {

      if (err) {
        console.error(err);
        console.log('BODY COMPLETO:', req.body);
        return res.status(500).json({ message: "Erro ao cadastrar visitante!" });
      }

      return res.json({ message: "Visitante cadastrado com sucesso!" });
    }
  );
});

// login
app.post("/login", (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = ? AND STATUS = ? ";

  db.query(sql, [email, password, 'A'], (err, result) => {

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
  const { data_atual, local } = req.query;

  let sql = `
    SELECT v.id, v.cpf_cnpj, concat(concat(v.nome, ' - '),vt.nome_tipo) as nome, v.empresa,
           DATE_FORMAT(v.data_entrada, '%d/%m/%Y %H:%i') as data_entrada,
           DATE_FORMAT(v.data_saida, '%d/%m/%Y %H:%i') as data_saida,
           v.placa, v.destino, v.atendente, v.obs, v.local, vt.nome_tipo
    FROM visitors v
    INNER JOIN visitor_type vt on vt.codigo_tipo = v.tipo_visitante
    WHERE 1=1
  `;

  let params = [];

  // filtra por data ignorando hora
  if (data_atual) {
    sql += ` AND DATE(v.data_registro) = ?`;
    params.push(data_atual);
  }

  // filtra por local
  if (local) {
    sql += ` AND v.local = ?`;
    params.push(local);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Erro ao buscar visitantes:", err);
      return res.status(500).json({ message: "Erro no servidor" });
    }

    res.json(result);
  });
});

app.get("/buscaVisitantes", (req, res) => {

  const sql = `
    SELECT
      v.cpf_cnpj,
      v.nome,
      v.empresa,
      v.placa
    FROM visitors v
    INNER JOIN (
      SELECT cpf_cnpj, MAX(data_entrada) as ultima
      FROM visitors
      GROUP BY cpf_cnpj
    ) x
    ON v.cpf_cnpj = x.cpf_cnpj
    AND v.data_entrada = x.ultima
    ORDER BY v.data_entrada DESC
  `;


  db.query(sql, (err, result) => {
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
})


app.get('/users', (req, res) => {
  const { search } = req.query;

  let sql = `
    SELECT id, user, email, status, permissao
    FROM users
  `;

  let params = [];

  if (search) {
    sql += `
      WHERE \`user\` LIKE ? OR email LIKE ?
    `;
    params.push(`%${search}%`, `%${search}%`);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error('Erro ao buscar usuários:', err);
      return res.status(500).json({ message: 'Erro no servidor' });
    }

    res.json(result);
  });
});

// tipos de visitantes
app.get('/visitor_type', (req, res) => {
  const sql = 'SELECT id, codigo_tipo, nome_tipo FROM visitor_type ORDER BY nome_tipo';

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ erro: 'Erro ao buscar tipos!' });
    }

    res.json(result);
  });
});


app.patch("/updateUsers", (req, res) => {
  try {
    const { id, status, permissao } = req.query;

    if (!id) {
      return res.status(400).json({ message: "ID é obrigatório" });
    }

    let fields = [];
    let values = [];

    if (status !== undefined) {
      fields.push("status = ?");
      values.push(status);
    }

    if (permissao !== undefined) {
      fields.push("permissao = ?");
      values.push(permissao);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nada para atualizar" });
    }

    values.push(id);

    const sql = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Erro SQL:", err);
        return res.status(500).json({ message: "Erro no banco" });
      }

      return res.json({
        message: "Usuário atualizado com sucesso",
        affectedRows: result.affectedRows
      });
    });

  } catch (error) {
    console.error("Erro geral:", error);
    return res.status(500).json({ message: "Erro no servidor" });
  }
});

app.delete("/excluirVisitante/:id", (req, res) => {
  try {
    const { id } = req.params;

    const sql = "DELETE FROM visitors WHERE id = ?";

    db.query(sql, [id], (err, result) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          erro: "Erro ao excluir visitante",
        });
      }

      return res.status(200).json({
        mensagem: "Visitante excluído com sucesso",
      });
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      erro: "Erro interno",
    });
  }
})


//Atualizar o visitante , somente admin
app.patch('/atualizarVisitante/:id', (req, res) => {

  const id = Number(req.params.id);

  const {
    data_entrada,
    data_saida,
    destino
  } = req.body;

  // 🔥 Converte datas para MySQL
  const dataEntradaMySQL = data_entrada
    ? formatToMySQLDateTime(data_entrada)
    : null;

  const dataSaidaMySQL = data_saida
    ? formatToMySQLDateTime(data_saida)
    : null;

  // ✅ valida se veio algo
  if (
    data_entrada === undefined &&
    data_saida === undefined &&
    destino === undefined
  ) {
    return res.status(400).json({
      message: 'Nenhum campo para atualizar'
    });
  }

  // 🔥 monta update dinâmico
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

  if (destino !== undefined) {
    updates.push('destino = ?');
    values.push(destino);
  }

  // ✅ id no final
  values.push(id);

  const sql = `
    UPDATE visitors
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

  db.query(sql, values, (err, result) => {

    if (err) {

      console.error(err);

      return res.status(500).json({
        message: 'Erro no servidor'
      });

    }

    if (result.affectedRows > 0) {

      res.json({
        success: true,
        message: 'Visitante atualizado com sucesso'
      });

    } else {

      res.status(404).json({
        success: false,
        message: 'Registro não encontrado'
      });

    }

  });

});


// Veiculos cadastrados por visitante ou pessoa.
app.get('/vehicles', (req, res) => {
  console.log('QUERY RECEBIDA:', req.query);

  const { cpf_cnpj } = req.query;

  if (!cpf_cnpj) {
    return res.json([]);
  }

  const sql = `
    SELECT 
      id,
      placa,
      modelo,
      marca
    FROM vehicles
    WHERE cpf_cnpj = ?
    ORDER BY placa
  `;

  db.query(sql, [cpf_cnpj], (err, rows) => {
    if (err) {
      console.log('ERRO /vehicles:', err);
      return res.json([]); // nunca quebra o front
    }

    return res.json(rows || []);
  });
});

// cadastro de veículo
app.post("/register-vehicle", (req, res) => {

  const {
    placa,
    modelo,
    marca,
    cpf_cnpj,
    cor,
    tipo_veiculo
  } = req.body;

  const query = "SELECT * FROM vehicles WHERE placa = ?";

  db.query(query, [placa], (err, result) => {

    if (err) {

      console.log(err);

      return res.status(500).json({
        message: "Erro ao verificar veículo"
      });
    }

    // 🔥 verifica se encontrou veículo
    if (result && result.length > 0) {

      return res.json({
        message: "Já existe um veículo com essa placa!"
      });

    }

    const sql = `
      INSERT INTO vehicles
      (
        placa,
        modelo,
        marca,
        cpf_cnpj,
        cor,
        tipo_veiculo
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        placa,
        modelo,
        marca,
        cpf_cnpj,
        cor,
        tipo_veiculo
      ],
      (err, result) => {

        if (err) {

          console.log(err);

          return res.status(500).json({
            message: "Erro ao cadastrar veículo"
          });
        }

        res.json({
          message: "Veículo cadastrado com sucesso!"
        });

      }
    );

  });

});
//Graficos
app.get("/dashboard", (req, res) => {

  const sql = `
    SELECT
      COUNT(*) as total,

      SUM(
        CASE
          WHEN data_saida IS NULL
          OR data_saida = ''
          THEN 1
          ELSE 0
        END
      ) as dentro,

      SUM(
        CASE
          WHEN data_saida IS NOT NULL
          AND data_saida <> ''
          THEN 1
          ELSE 0
        END
      ) as sairam

    FROM visitors

    WHERE DATE(data_entrada) = CURDATE()
  `;

  db.query(sql, (err, result) => {

    if (err) {

      console.log(err);

      return res.status(500).json({
        message: "Erro ao buscar dashboard"
      });
    }

    res.json(result[0]);

  });

});

app.listen(3000, "0.0.0.0", () => {
  console.log("Servidor rodando na porta 3000");
});