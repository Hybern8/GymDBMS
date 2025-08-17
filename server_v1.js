const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== SQL Server Config =====
const dbConfig = {
    user: 'fico',        // replace
    password: 'Gym',     // replace
    server: 'localhost\\SQLEXPRESS', // your server
    database: 'GymDB',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// ===== Routes =====

// Add new user
app.post('/users', async (req, res) => {
    const { full_name, phone, email } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('FullName', sql.NVarChar, full_name)
            .input('Phone', sql.NVarChar, phone)
            .input('Email', sql.NVarChar, email)
            .query(`
                INSERT INTO Users (FullName, Phone, Email)
                VALUES (@FullName, @Phone, @Email)
            `);
        res.json({ message: 'User added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Search users by name or phone
app.get('/search', async (req, res) => {
    const { q } = req.query;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('SearchTerm', sql.NVarChar, `%${q}%`)
            .query(`
                SELECT Id, FullName, Phone 
                FROM Users
                WHERE FullName LIKE @SearchTerm
                   OR Phone LIKE @SearchTerm
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Log a visit with amount
app.post('/visits', async (req, res) => {
    const { user_id, amount } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UserId', sql.Int, user_id)
            .input('Amount', sql.Decimal(10, 2), amount)
            .query(`
                INSERT INTO Visits (UserId, Amount)
                VALUES (@UserId, @Amount);
                SELECT SCOPE_IDENTITY() AS VisitID;
            `);
        res.json({ visit_id: result.recordset[0].VisitID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get visits by date range + totals
app.get('/visits', async (req, res) => {
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
                SELECT v.Id AS VisitID, u.FullName, v.Amount, v.VisitDate
                FROM Visits v
                JOIN Users u ON v.UserId = u.Id
                WHERE CAST(v.VisitDate AS DATE) BETWEEN @StartDate AND @EndDate
                ORDER BY v.VisitDate ASC
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

// ===== Start Server =====
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
