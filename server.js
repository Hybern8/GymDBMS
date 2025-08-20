require('dotenv').config();// load environment variable from .env
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');
const bcrypt = require('bcryptjs'); // <- bcryptjs instead of bcrypt
const session = require('express-session');
const ngrok = require("@ngrok/ngrok");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== SQL Server Config =====
const dbConfig = {
    user: 'fico',        // replace
    password: 'Gym',     // replace
    server: 'localhost\\SQLEXPRESS',
    database: 'GymDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// ===== Session Setup =====
app.use(session({
    secret: 'your-secret-key', // change this
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// ===== Staff Registration (One-time) =====
app.post('/staff/register', async (req, res) => {
    const { fullname, gender, email, username, password } = req.body;

    try {
        const pool = await sql.connect(dbConfig);

        // check if username exists
        const exists = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT * FROM Staff WHERE Username = @Username');

        if (exists.recordset.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        await pool.request()
            .input('FullName', sql.NVarChar, fullname)
            .input('Gender', sql.NVarChar, gender)
            .input('Email', sql.NVarChar, email)
            .input('Username', sql.NVarChar, username)
            .input('PasswordHash', sql.NVarChar, hash)
            .query('INSERT INTO Staff (FullName, Gender, Email, Username, PasswordHash) VALUES (@FullName, @Gender, @Email, @Username, @PasswordHash)');

        res.json({ message: 'Staff registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Staff Login =====
app.post('/staff/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('Username', sql.NVarChar, username)
            .query('SELECT * FROM Staff WHERE Username = @Username');

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const staff = result.recordset[0];
        const match = await bcrypt.compare(password, staff.PasswordHash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // store staff in session
        req.session.staffId = staff.Id;
        req.session.staffUsername = staff.Username;

        res.json({ message: 'Logged in successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Middleware to Protect Routes =====
function requireLogin(req, res, next) {
    if (!req.session.staffId) {
        return res.status(401).json({ error: 'Staff login required' });
    }
    next();
}
//===== Staff Logout =====
app.post('/staff/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Logged out' });
    });
});

// ===== Add new user =====
app.post('/users', requireLogin, async (req, res) => {
    const { full_name, phone, email, gender, membership } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('FullName', sql.NVarChar, full_name)
            .input('Phone', sql.NVarChar, phone)
            .input('Email', sql.NVarChar, email)
            .input('Gender', sql.NVarChar, gender)
            .input('Membership', sql.NVarChar, membership)
            .query(`
                INSERT INTO Users (FullName, Phone, Email, Gender, Membership)
                VALUES (@FullName, @Phone, @Email, @Gender, @Membership)
            `);
        res.json({ message: 'User added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Search user =====
app.get('/search', requireLogin, async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('q', sql.NVarChar, `%${q}%`)
            .query(`SELECT * FROM Users WHERE FullName LIKE @q`);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Log a visit with staff tracking =====
app.post('/visits', requireLogin, async (req, res) => {
    const { user_id, amount } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UserId', sql.Int, user_id)
            .input('Amount', sql.Decimal(10, 2), amount)
            .input('StaffId', sql.Int, req.session.staffId)
            .query(`
                INSERT INTO Visits (UserId, Amount, StaffId)
                VALUES (@UserId, @Amount, @StaffId);
                SELECT SCOPE_IDENTITY() AS VisitID;
            `);
        res.json({ visit_id: result.recordset[0].VisitID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== Get visits by date range + staff info =====
app.get('/visits', requireLogin, async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ error: "Start and End dates are required" });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Visits list
        const visitsResult = await pool.request()
            .input('StartDate', sql.DateTime, start)
            .input('EndDate', sql.DateTime, end)
            .query(`
                SELECT v.Id AS VisitID, u.FullName, u.Membership, v.Amount, v.VisitDate,
                       s.Username AS StaffUsername
                FROM Visits v
                JOIN Users u ON v.UserId = u.Id
                JOIN Staff s ON v.StaffId = s.Id
                WHERE CAST(v.VisitDate AS DATE) BETWEEN @StartDate AND @EndDate
                ORDER BY v.VisitDate DESC
            `);

        // Totals
        const totalsResult = await pool.request()
            .input('StartDate', sql.Date, start)
            .input('EndDate', sql.Date, end)
            .query(`
                SELECT COUNT(*) AS TotalEntries, 
                       ISNULL(SUM(Amount), 0) AS TotalRevenue
                FROM Visits
                WHERE CAST(VisitDate AS DATE) BETWEEN @StartDate AND @EndDate
            `);

        res.json({
            visits: visitsResult.recordset,
            totals: totalsResult.recordset[0]
        });

    } catch (err) {
        console.error("Error in /visits:", err);
        res.status(500).json({ error: err.message });
    }
});

// ===== Get all Users or members of the Gym =====
app.get('/users', /* requireLogin, */ async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT Id, FullName, Phone, Gender, Email, Membership
      FROM Users
      ORDER BY FullName ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all staff
app.get("/staff", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT Id, FullName, Gender, Username FROM Staff ORDER BY FullName ASC
    `);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Start Server =====
app.listen(3000, async () => {
    console.log('✅ Server running on http://localhost:3000');

    // Read token from token.txt
    let NGROK_AUTHTOKEN;
    try {
        NGROK_AUTHTOKEN = fs.readFileSync(path.join(__dirname, "token.txt"), "utf8").trim();
        if (!NGROK_AUTHTOKEN) throw new Error("Token is empty");
    } catch (err) {
        console.error("❌ Failed to read ngrok token:", err.message);
        process.exit(1);
    }

    try {
        // Connect ngrok
        const ngrokSession = await ngrok.connect({
            authtoken: NGROK_AUTHTOKEN,
            addr: 3000
        });

        // Call the .url() function to get the actual public URL
        const publicUrl = await ngrokSession.url();  
        console.log(`🌍 Public ngrok URL: ${publicUrl}`);
    } catch (err) {
        console.error("❌ Error starting ngrok:", err);
    }
});