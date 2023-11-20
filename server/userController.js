
const sqlite3 = require('sqlite3').verbose();


class UserController{

    #db;

    constructor(){

        this.#db = new sqlite3.Database('database.db');

        /*this.#db.run(`
            DROP TABLE users;
        `);*/

        this.#db.run(`
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )
        `);

    }

    // Request handler
    async handleUserRequest(request) { 

        let response;

        if (request.action === "register") {
            console.log("\n  Registering new user...");
            response =  await this.#registerUser(request.email, request.username, request.password);
        } else if(request.action === "login") {
            console.log("\n  Logging user...");
            response = await this.#loginUser(request.email, request.password); 
        }

        console.log("\n  Response: " + JSON.stringify(response));
        return JSON.stringify(response);

    }
    
    // Function to check if a user exists
    #checkUserExists(email) {
        return new Promise((resolve, reject) => { 
            this.#db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, row) => {
                if (err){
                    console.error(err.message);
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    }
    
    // Function to register a new user
    async #registerUser(email, username, password) {
        
        return this.#checkUserExists(email)
        .then((userExists) => {
    
            if (userExists) return {"success": false};
        
            return new Promise((resolve, reject) => {
                this.#db.serialize(() => {
                    this.#db.run(`INSERT INTO users (email, username, password) VALUES (?, ?, ?)`, [email, username, password], (err) => {
                        if (err){
                            console.error(err.message);
                            reject(err);
                        } else {
                            resolve({"success": true});
                        } 
                    });
                });
            });
        });
    }
      
    // Function to login a user
    async #loginUser(email, password) {

        return this.#checkUserExists(email)
        .then((userExists) => {
        
            if (!userExists) return {"success": false, "error": "User does not exist"};
        
            return new Promise((resolve, reject) => {
                this.#db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, row) => {
                    if (err) {
                        console.error(err.message);
                        reject(err);
                    } else {
                        resolve(row ? {"success": true, "username": row.username} : {"success": false, "error": "Wrong password"});
                    }
                });
            });
        });
    }
      
}

module.exports = UserController;