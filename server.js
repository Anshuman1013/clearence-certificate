//Anshuman
const multer = require('multer');
const xlsx = require('xlsx');
const fileUpload = require('express-fileupload');
//Anshuman

const express = require('express');
const morgan = require('morgan')
const dotenv = require('dotenv');
const flash = require('express-flash');
const session = require('express-session');

const mysql = require('mysql');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
dotenv.config({path:'config.env'});
const bodyParser = require("body-parser");
const path = require('path');
const app = express();
const port = 8080

let mysqlx = mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'',
    database: 'test'
})

mysqlx.connect((err) =>{
    if(!err){
        console.log('db connection successful');
    }
    else{
        console.log('db connection failed'+JSON.stringify(err,undefined,2));
    }
})
//Anshuman

const upload = multer({ dest: 'uploads/' });

//Anshuman
app.use(morgan('tiny'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set("view engine","ejs");

app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'SECRET' 
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy(
    function(username, password, done) {
        mysqlx.query('SELECT * FROM users WHERE username = ?', [username], function(err, rows, fields) {
            if (err) { return done(err); }
            if (!rows.length) { return done(null, false, { message: 'Incorrect username.' }); }
            if (rows[0].password != password) { return done(null, false, { message: 'Incorrect password.' }); }
            return done(null, rows[0]);
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    mysqlx.query('SELECT * FROM users WHERE id = ?', [id], function(err, rows, fields) {
        done(err, rows[0]);
    });
});

// Middleware to make the current user available in templates
app.use(function(req, res, next) {
    res.locals.currentUser = req.user;
    next();
});











// Routes
app.get('/', function(req, res) {
    res.render('index', { user: req.user });
});

app.get('/login', function(req, res) {
    res.render('login', { message: req.flash('error') });
});
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
      if (err) {
          return next(err);
      }
      if (!user) {
          req.flash('error', info.message);
          return res.redirect('/login');
      }
      req.logIn(user, function(err) {
          if (err) {
              return next(err);
          }
          
          req.session.username = req.user.username ;

          res.redirect('/filter');

      });
  })(req, res, next);
});



app.get('/logout', function(req, res) {
  req.session.destroy(function(err) {
    if (err) {
        console.error("Error destroying session: ", err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
});

});








//branch , course , semester ,session, year
app.get('/filter', function(req, res) {
  const userId = req.user;
// console.log(userId);
  // Retrieve batches from the batches table
  mysqlx.query('SELECT DISTINCT batch FROM students', function(err, batchRows, fields) {
    if (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const batches = batchRows.map(row => row.batch);

    // Retrieve departments from the departments table
    mysqlx.query('SELECT DISTINCT semester FROM students', function(err, deptRows, fields) {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
        return;
      }

      const semesters = deptRows.map(row => row.semester);

      // Retrieve semesters from the semesters table
      mysqlx.query('SELECT DISTINCT department FROM students', function(err, semRows, fields) {
        if (err) {
          console.log(err);
          res.status(500).send('Internal Server Error');
          return;
        }

        const departments = semRows.map(row => row.department);

        // Retrieve sections from the sections table
        mysqlx.query('SELECT DISTINCT section FROM students', function(err, secRows, fields) {
          if (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
            return;
          }

          const sections = secRows.map(row => row.section);
          
          res.render('filter', { 
            batches: batches,
            departments: departments,
            semesters: semesters,
            sections: sections,
            user: userId 
          });
        });
      });
    });
  });
});


  










app.post('/students', function(req, res) {
  const userId = req.session.username;
  // const users = req.body.username;
  const batch = req.body.batch;
  const semester = req.body.semester;
  const department = req.body.department;
  const section = req.body.section;


  req.session.batch = req.body.batch ;
  req.session.semester = req.body.semester ;
  req.session.department = req.body.department ;
  req.session.section = req.body.section ;



  // console.log(userId);
  // Construct SQL query to retrieve appropriate rows
  


  // Retrieve access rights for current user from user_student_access table
  mysqlx.query('SELECT access_rights FROM users WHERE username = ?', [userId], function(err, rows, fields) {
    if (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (rows.length === 0) {
      // User does not have any access rights
      res.status(401).send('Unauthorized');
      return;
    }

    const accessRights = rows[0].access_rights.split(',');

    // Construct SELECT query with specified access rights
    const selectCols = accessRights.join(',');
    // const queryx = `SELECT ${selectCols} FROM students`;
    let query = `SELECT ${selectCols} FROM students WHERE `;
    if (batch) query += " batch = " + mysql.escape(batch);
    if (semester) query += " AND semester = " + mysql.escape(semester);
    if (department) query += " AND department = " + mysql.escape(department);
    if (section) query += " AND section = " + mysql.escape(section);

    // Execute SELECT query
    mysqlx.query(query, function(err, rows, fields) {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
        return;
      }
      
      res.render('students', { 
        students: rows, 
        user: userId 
      });
      
    });
  });
});



app.get('/students', function(req, res) {
  // req.session.batch = req.body.batch ;
  // req.session.semester = req.body.semester ;
  // req.session.department = req.body.department ;
  // req.session.section = req.body.section ;

  const batch = req.session.batch;
  const semester = req.session.semester;
  const department = req.session.department;
  const section = req.session.section;

  const userId = req.session.username;
  mysqlx.query('SELECT access_rights FROM users WHERE username = ?', [userId], function(err, rows, fields) {
    if (err) {
      console.log(err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (rows.length === 0) {
      // User does not have any access rights
      res.status(401).send('Unauthorized');
      return;
    }

    const accessRights = rows[0].access_rights.split(',');

    // Construct SELECT query with specified access rights
    const selectCols = accessRights.join(',');
    // const queryx = `SELECT  FROM students`;
    

    let query = `SELECT ${selectCols} FROM students WHERE `;
    if (batch) query += " batch = " + mysql.escape(batch);
    if (semester) query += " AND semester = " + mysql.escape(semester);
    if (department) query += " AND department = " + mysql.escape(department);
    if (section) query += " AND section = " + mysql.escape(section);


    // Execute SELECT query
    mysqlx.query(query, function(err, srows, fields) {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
        return;
      }
      res.render('students', { students: srows });
  });


  
});

});

  
  app.post('/students/:rno/verify', function(req, res) {
    // console.log(req.params);
    // console.log(req.session.username);
    const usertable = req.session.username;
    const studentId = req.params.rno;
    const query = `UPDATE ${usertable} SET verification = 1 WHERE rno = ?`;
    mysqlx.query(query, [studentId], function(err, result) {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
        return;
      }
      res.redirect('/students');
    });
  });
  

  app.post('/students/:rno/unverify', function(req, res) {
    // console.log(req.params);
    console.log(req.session.username);
    const usertable = req.session.username;
    const studentId = req.params.rno;
    const query = `UPDATE ${usertable} SET verification = 0 WHERE rno = ?`;
    console.log(query);
    mysqlx.query(query, [studentId], function(err, result) {
      if (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
        return;
      }
      res.redirect('/students');
    });
  });
  
  // app.get('/download', function(req, res) {
  //   const userId = req.user;
  // // console.log(userId);
  //   // Retrieve batches from the batches table
  //   res.render('download', { user: req.user });
  // });









  
  //Anshuman Codes start
  app.use(express.static("public"));

  // making route to page to generate and download pdf
  app.get('/formgenerate', function(req, res) {
    res.render('formgenerate');
  });
  app.get('/adminlogin', function(req, res) {
    res.render('adminlogin',{ message: req.flash('error') });
  });
  app.get('/studentlogin', function(req, res) {
    res.render('studentlogin',{ message: req.flash('error') });
  });
  app.get('/excelupload', (req, res) => {
    res.render('excelupload');
  });
  // app.get('/', function(req, res) {
  //   res.render('/clearence-system-main/images/college.png');
  // });
  

  app.use(fileUpload());

  app.post('/upload', (req, res) => {
    // check if file was uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }
  
    // get uploaded file
    let uploadedFile = req.files.myfile;
  
    // set upload path and file name
    let uploadPath = path.join(__dirname, 'uploads', 'testexcel.xlsx');
  
    // save uploaded file
    uploadedFile.mv(uploadPath, (err) => {
      if (err) {
        return res.status(500).send(err);
      }
  
      // read uploaded file and parse data using xlsx module
      let workbook = xlsx.readFile(uploadPath);
      let worksheet = workbook.Sheets[workbook.SheetNames[0]];
      let data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
      // extract data into arrays for MySQL insertion
      let values = [];
      for (let i = 1; i < data.length; i++) {
        let row = data[i];
        values.push([row[0], row[1]]);
      }
  
      // insert data from uploaded file to MySQL database
      let sql = "INSERT INTO man (roll, class) VALUES ?";
      mysqlx.query(sql, [values], (err, result) => {
        if (err) {
          return res.status(500).send(err);
        }
  
        res.send('File uploaded and data inserted to database.');
      });
    });
  });

  // app.get('/images/logo.png', function(req, res) {
  //   res.render('logo.png');
  // });

  //Anshuman Codes end
    











app.listen(port, () => { console.log(`server is running`)});
