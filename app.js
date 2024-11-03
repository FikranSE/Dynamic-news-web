const fs = require('fs');
const express = require('express')
const mysql = require('mysql2')
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path=require('path');
const moment = require('moment');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash')
const slugify = require('slugify')

const app = express() 
const port = 3000;



//buat folder penampung file jika tidak ada
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// middleware untuk parsing request body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());


app.set('views', path.join(__dirname, '/views'));

app.use('/css', express.static(path.resolve(__dirname, "assets/css")));
app.use('/img', express.static(path.resolve(__dirname, "assets/img")));
app.use('/submission', express.static('/img'));

// template engine
app.set('view engine', 'ejs')

// layout ejs
app.use(expressLayouts);

// mengatur folder views
app.set('views', './views');
// Middleware session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Middleware flash messages
app.use(flash());

// Create multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Create multer upload configuration
const upload = multer({ storage: storage });


const saltRounds = 10;



// Konfigurasi koneksi ke database
const db = mysql.createConnection({
  host: 'localhost', 
  user: 'root',
  password: '',
  database: 'db_berita' 
});

db.connect((err) => {
  if (err) {
    console.error('Gagal terkoneksi ke database:', err);
  } else {
    console.log('Terhubung ke database MySQL');
  }
});



//register dan login
app.get('/register', function (req, res) {
  const errorMessage = req.session.errorMessage;
  req.session.errorMessage = ''; // Clear the error message from session
  const successMessage = req.session.successMessage;
  req.session.successMessage = '';
  res.render('register',{
    title:'Register',
    layout:'layouts/auth-layout',
    errorMessage : errorMessage,
    successMessage : successMessage
  });
})

app.post('/register', function (req, res) {
  const { username, password, confirm_password } = req.body;

  // check if username already exists
  const sqlCheck = 'SELECT * FROM admin WHERE username = ?';
  db.query(sqlCheck, username, (err, result) => {
    if (err) throw err;
      console.log("tes");
    if (result.length > 0) {
      console.error({ message: 'Username sudah terdaftar', err });
      req.session.errorMessage = 'Username sudah terdaftar';
      return res.redirect('/register');
    }

    if (password !== confirm_password) {
      console.error({ message: 'Password tidak cocok!', err });
      req.session.errorMessage = 'Password tidak cocok!';
      return res.redirect('/register');
    }

    // hash password
    bcrypt.hash(password, saltRounds, function(err, hash) {
      if (err) throw err;

      // insert user to database
      const sqlInsert = "INSERT INTO admin (username, password) VALUES (?, ?)";
      const values = [username, hash];
      db.query(sqlInsert, values, (err, result) => {
        if (err) throw err;
        console.log({ message: 'Registrasi berhasil', values });
        res.redirect('/login');
      });
    });
  });
});


// login page
app.get('/login', function (req, res) {
  const errorMessage = req.session.errorMessage;
  req.session.errorMessage = ''; // Clear the error message from session
  const successMessage = req.session.successMessage;
  req.session.successMessage = '';
  res.render('login',{
    title:'Login',
    layout:'layouts/auth-layout',
    errorMessage : errorMessage,
    successMessage : successMessage
  });
})

app.post('/login', function (req, res) {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM admin WHERE username = ?';
  db.query(sql, [username], function(err, result) {
    if (err) {
      console.error({ message: 'Internal Server Error', err });
      req.session.errorMessage = 'Internal Server Error';
      return res.redirect('/login');
    }
    if (result.length === 0) {
      console.error({ message: 'Username atau Password salah!!', err });
      req.session.errorMessage = 'Username atau Password salah!!';
      return res.redirect('/login');
    }

    const admin = result[0];

    // compare password
    bcrypt.compare(password, admin.password, function(err, isValid) {
      if (err) {
        console.error({ message: 'Internal Server Error', err });
        req.session.errorMessage = 'Internal Server Error';
        return res.redirect('/login');
      }

      if (!isValid) {
        console.error({ message: 'Username atau Password salah!!', err });
        req.session.errorMessage = 'Username atau Password salah!!';
        return res.redirect('/login');
      }

      // generate token
      const token = jwt.sign({ admin_id: admin.admin_id }, 'secret_key');
      res.cookie('token', token, { httpOnly: true });

      console.log({ message: 'Login Berhasil', admin });
      return res.redirect('/dashboard');
    });
  });
});

// logout
app.get('/logout', function(req, res) {
  res.clearCookie('token');
  res.redirect('/login');
});

// middleware untuk memeriksa apakah user sudah login atau belum
function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    res.redirect('/login');
    return;
  }

  jwt.verify(token, 'secret_key', function(err, decoded) {
    if (err) {
      res.redirect('/login');
      return;
    }

    req.admin_id = decoded.admin_id;
    next();
  });
}



////////////////////////////////////////////////////
//                     INDEX                     //
app.get('/', function (req, res) {
  const allSelect = `SELECT * FROM content`;
  const contentSql1 = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE content.id_content = 8 `;
  const contentSql2 = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE content.id_content = 9 `;
  const contentSql3 = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE content.id_content = 10 `;
  const contentSql4 = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE content.id_content = 11 `;
  db.query(allSelect, (err,allResult)=>{
    if (err) throw err;
  db.query(contentSql1, (err,contentSql1)=>{
    if (err) throw err;
  db.query(contentSql2, (err,contentSql2)=>{
    if (err) throw err;
  db.query(contentSql3, (err,contentSql3)=>{
    if (err) throw err;
  db.query(contentSql4, (err,contentSql4)=>{
    if (err) throw err;
      res.render('index',{
        contents: allResult,
        contentSql1: contentSql1[0],
        contentSql2: contentSql2[0],
        contentSql3: contentSql3[0],
        contentSql4: contentSql4[0],
        title:'Home',
        moment,
        layout:'layouts/layout-berita'
    })
  })
})
})
})
})
})

////////////////////////////////////////////////////
//                     PUBLISH                     //
app.get('/publish', requireAuth, function (req, res) {
  const kategoriSql = `SELECT * FROM kategori`;
  db.query(kategoriSql, (err,katResult)=>{
    if (err) throw err;
      res.render('publish',{
        kategori: katResult,
        title:'Publish',
        layout:'layouts/main-layout'
    })
  })
})

app.post('/publish', upload.single('gambar'), requireAuth, (req, res) => {
  const { title, excerpt, id_kategori, description } = req.body;
  const gambar = req.file ? req.file.filename : null;
  const admin_id = req.admin_id;

  // Menghasilkan slug dari judul
  const slug = slugify(title, {
    replacement: '-',
    lower: true,
  });

  const insertSql = `INSERT INTO content (title, excerpt, id_kategori, gambar, description, admin_id, slug) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const insertValues = [title, excerpt, id_kategori, gambar, description, admin_id, slug];
  db.query(insertSql, insertValues, (err, result) => {
    if (err) {
      throw err;
    }
    console.log({ message: 'Publish complete!', insertValues });
    const source = path.join(__dirname, 'uploads', gambar);
    const destination = path.join(__dirname, 'assets', 'img', gambar);
    fs.copyFileSync(source, destination);
    res.redirect('/dashboard');
  });
});




app.get('/dashboard', requireAuth,function (req, res) {
  let admin_id = req.admin_id;
  const content = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori `;
  const admin = `SELECT * FROM admin WHERE admin_id = ${admin_id}`;
  const kategori = `SELECT * FROM kategori`;
  db.query(content, (err, content) => {
    if (err) { 
      throw err;
    }
  db.query(admin, (err, admin) => {
    if (err) { 
      throw err;
    }
  db.query(kategori, (err, kategori) => {
    if (err) { 
      throw err;
    }
    res.render('dashboard', {
      title: 'Dashboard', 
      admin : admin[0],
      content ,
      kategori ,
      moment,
      layout: 'layouts/main-layout'
      });
      });
    });
  });
});

app.get('/to-category/:kategori', function (req, res) {
  const kategori = req.params.kategori;
  const contentSql = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON admin.admin_id = content.admin_id
  JOIN kategori ON kategori.id_kategori = content.id_kategori
  WHERE content.kategori = ?`;
  db.query(contentSql, [kategori], (err, results) => {
    if (err) {
      throw err;
    }
    res.render('to-category', {
      title: 'To cataegory', 
      layout: 'layouts/layout-berita',
      allContent: results,
      moment
    });
  });
});

app.get('/detail-news/:slug', function (req, res) {
  const slug = req.params.slug;
  const contentSql = `SELECT content.*, admin.*, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE content.slug = ?`;
  const allContent = `SELECT * FROM content LIMIT 5`;
  db.query(contentSql, [slug], (err, results) => {
    if (err) {
      throw err;
    }
  db.query(allContent, [slug], (err, allContent) => {
    if (err) {
      throw err;
    }
    res.render('detail-news', {
      title: 'Detail', 
      layout: 'layouts/layout-berita',
      detailNews: results[0],
      allContent: allContent,
      moment
      })
    });
  });
});


app.get('/edit-content/:id_content', requireAuth,function (req, res) {
  const id_content = req.params.id_content; 
  const contentSql =  `SELECT content.*, kategori.kategori
  FROM content
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE content.id_content = ?
  `;
  db.query(contentSql, [id_content], (err, results) => {
    if (err) {
      throw err;
    }

    const dataContent = results[0];

    res.render('edit-content', {
      title: 'Edit content',
      layout: 'layouts/main-layout',
      dataContent
    });
  });
});


app.get('/categories', function (req, res) {
  const kategoriSql = `SELECT * FROM kategori`;
  const contentSql = `SELECT content.*, admin.username, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  `;

  db.query(kategoriSql, (err,katResult)=>{
    if (err) throw err;
  db.query(contentSql, (err,conResult)=>{
    if (err) throw err;
      res.render('categories',{
        categories: katResult,
        contents: conResult,
        title:'Categories',
        moment,
        layout:'layouts/layout-berita'
     })
    })
  })
})

app.get('/add-kategori', requireAuth, function (req, res) {
  const kategoriSql = `SELECT * FROM kategori`;
  db.query(kategoriSql, (err,katResult)=>{
    if (err) throw err;
      res.render('add-kategori',{
        kategories: katResult,
        title:'add-kategori',
        moment,
        layout:'layouts/main-layout'
    })
  })
})

app.post('/add-kategori', (req, res) => {
  const { kategori } = req.body; 
  const katSql = `SELECT * FROM kategori WHERE kategori = ?`;
  db.query(katSql, kategori, (err, katResult) => {
    if (err) {
      throw err;
    }
 
    if (katResult.length > 0) {
      console.log({ message: 'Category already exists', category: kategori });
      res.redirect('/add-kategori');
    } else {
      const insertSql = `INSERT INTO kategori (kategori) VALUES (?)`;
      db.query(insertSql, kategori, (err, result) => {
        if (err) {
          throw err;
        }
        console.log({ message: 'Adding complete!', kategori });
        res.redirect('/add-kategori');
      });
    }
  });
});





app.get('/profil', requireAuth, function (req, res) {
  let admin_id = req.admin_id;
  const adminSql = `SELECT * FROM admin WHERE admin_id = ${admin_id}`;
  const adminContentSql = `SELECT content.*, admin.username, kategori.kategori
  FROM content
  JOIN admin ON content.admin_id = admin.admin_id
  JOIN kategori ON content.id_kategori = kategori.id_kategori
  WHERE admin.admin_id = ${admin_id}`;
  db.query(adminSql, (err,adminResult)=>{
    if (err) throw err;
  db.query(adminContentSql, (err,conResult)=>{
    if (err) throw err;
      res.render('profil',{
        admin: adminResult[0],
        content: conResult,
        title:'profil',
        moment,
        layout:'layouts/main-layout'
      })
    })
  })
})

app.get('/edit-profil', requireAuth, function (req, res) {
  let admin_id = req.admin_id;
  const adminSql = `SELECT * FROM admin WHERE admin_id = ${admin_id}`;
  db.query(adminSql, (err,adminResult)=>{
    if (err) throw err;
      res.render('edit-profil',{
        admin: adminResult[0],
        title:'edit profil',
        layout:'layouts/main-layout'
    })
  })
})

app.get('/add-publisher', requireAuth, function (req, res) {
  const userSql = `SELECT * FROM admin`;
  db.query(userSql, (err,results)=>{
  if (err) throw err
  
      res.render('add-publisher',{
        users : results,
        moment : moment,
        title:'Add publisher',
        layout:'layouts/main-layout'
    })
  })
})
app.post('/add-publisher', function (req, res) {
  const { username, password, confirm_password } = req.body;

  // check if username already exists
  const sqlCheck = 'SELECT * FROM admin WHERE username = ?';
  db.query(sqlCheck, username, (err, result) => {
    if (err) throw err;
      console.log("tes");
    if (result.length > 0) {
      console.error({ message: 'Username sudah terdaftar', err });
      req.session.errorMessage = 'Username sudah terdaftar';
      return res.redirect('/add-publisher');
    }

    if (password !== confirm_password) {
      console.error({ message: 'Password tidak cocok!', err });
      req.session.errorMessage = 'Password tidak cocok!';
      return res.redirect('/add-publisher');
    }

    // hash password
    bcrypt.hash(password, saltRounds, function(err, hash) {
      if (err) throw err;

      // insert user to database
      const sqlInsert = "INSERT INTO admin (username, password) VALUES (?, ?)";
      const values = [username, hash];
      db.query(sqlInsert, values, (err, result) => {
        if (err) throw err;
        console.log({ message: 'Registrasi berhasil', values });
        res.redirect('/add-publisher');
      });
    });
  });
});

app.post('/edit-profil', upload.single('avatar'), requireAuth, (req, res) => {
  let admin_id = req.admin_id;
  const avatar = req.file.filename;

  const adminSql = `UPDATE admin SET avatar=? WHERE admin_id=${admin_id}`;
  db.query(adminSql, avatar, (err, result) => {
    if (err) {
      throw err;
    }
    console.log({msg:'data profil telah diupdate'},avatar);
    const source = path.join(__dirname, 'uploads', avatar);
    const destination = path.join(__dirname, 'assets', 'img', avatar);
    fs.copyFileSync(source, destination);

    res.redirect('/profil');
  });
});
 
app.get('/about-us', requireAuth,function (req, res) {
    res.render('about-us', {
      title: 'About Us',
      layout: 'layouts/layout-berita'
  });
});

app.get('/delete/:id_kategori',(req, res) => {
  const id_kategori = req.params.id_kategori;
  const deleteSql = `DELETE FROM kategori WHERE id_kategori = ?`;
  db.query(deleteSql, [id_kategori], (err, result) => {
    if (err) {
      throw err;
    }
    console.log('Kategori berhasil dihapus');
    res.redirect('/add-kategori');
  });
});

app.get('/delete-content/:id_content',(req, res) => {
  const id_content = req.params.id_content;
  const deleteSql = `DELETE FROM content WHERE id_content = ?`;
  db.query(deleteSql, [id_content], (err, result) => {
    if (err) {
      throw err;
    }
    console.log('Content berhasil dihapus');
    res.redirect('/profil');
  });
});



  app.get('/search-berita', (req, res) => {
    const query = req.query.query; 
  
    const contentSql = `
    SELECT content.*, admin.*, kategori.kategori
    FROM content
    JOIN kategori ON content.id_kategori = kategori.id_kategori
    JOIN admin ON admin.admin_id = content.id_content
    WHERE content.title LIKE '%${query}%'
      OR content.excerpt LIKE '%${query}%'
      OR content.description LIKE '%${query}%'
      OR content.created_at LIKE '%${query}%'
      OR kategori.kategori LIKE '%${query}%'
      OR admin.username LIKE '%${query}%'

    `;
  
  
    // const searchQuery = `%${query}%`; 
    db.query(contentSql, (err, searchResults) => {
        if (err) {
          throw err;
        }
        res.render('search-result-berita', {
          title: 'Search Results',
          layout: 'layouts/layout-berita',
          contents: searchResults,
          query: query
      });
    });
  });
  



app.listen(port,()=>{
  console.log(`listening on port ${port}`)
})