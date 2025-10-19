import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable()
export class UsersService {
  private users: User[] = [];
  private nextId = 1;

  // Return all users
  findAll(): User[] {
    return this.users;
  }

  // Find one user by ID
  findOne(id: number): User | undefined {
    return this.users.find((user) => user.id === id);
  }

  // Create a new user
  create(data: { name: string; email: string }): User {
    const newUser: User = {
      id: this.nextId++,
      name: data.name,
      email: data.email,
    };
    this.users.push(newUser);
    return newUser;
  }
}
