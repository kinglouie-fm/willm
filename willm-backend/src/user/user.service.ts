// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import * as fastcsv from 'fast-csv';
import * as jwt from 'jsonwebtoken';
const CSV_FILE_PATH = path.resolve(__dirname, '../../users.csv');
const JWT_SECRET = 'your_jwt_secret';

@Injectable()
export class UserService {
  async register(username: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    // Check if the CSV file exists. If not, write the headers.
    if (!fs.existsSync(CSV_FILE_PATH)) {
      fs.writeFileSync(CSV_FILE_PATH, 'username,password\n');
    }

    // Open the file in append mode and write the new user's data
    const csvStream = fs.createWriteStream(CSV_FILE_PATH, { flags: 'a' });
    csvStream.write(`${username},${hashedPassword}\n`);
    csvStream.end();
  }

  async validateUser(username: string, password: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const users = [];
      if (!fs.existsSync(CSV_FILE_PATH)) {
        resolve(false);
      }
      else {
        fs.createReadStream(CSV_FILE_PATH)
          .pipe(fastcsv.parse({ headers: true }))
          .on('error', (error) => {
            reject(error);
          })
          .on('data', (row) => {
            users.push(row);
          })
          .on('end', async () => {
            const user = users.find((u) => u.username === username);
            if (user) {
              const isMatch = await bcrypt.compare(password, user.password);
              resolve(isMatch);
            } else {
              resolve(false);
            }
          });
        }
    });
  }

  generateJwtToken(username: string): string {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  }

  verifyJwtToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }
}
