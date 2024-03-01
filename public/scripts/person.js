// Person class definition
class Person {
  constructor(name) {
    this.name = name;
  }
}

// User class extending Person
class User extends Person {
  constructor(name, email, password) {
    super(name,);
    this.email = email;
    this.password = password;
  }
}

// Admin class extending Person
class Admin extends Person {
  constructor(name, email) {
    super(name);
    this.email = email;

  }
}

export { User, Admin };
