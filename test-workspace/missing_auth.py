from flask import Flask
app = Flask(__name__)

@app.route("/admin")
def admin_panel(): 
    return "Sensitive admin panel exposed"
 
import sqlite3
from flask import Flask, request

app = Flask(__name__)

@app.route("/user")
def get_user():
    username = request.args.get("username")
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE name = '{username}'")
    return str(cursor.fetchall())
