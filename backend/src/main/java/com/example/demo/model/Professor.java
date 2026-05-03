package com.example.demo.model;

    import jakarta.persistence.*;

    @Entity
    @Table (name="professor")

    public class Professor {
        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)

        private Long id;

        private String name;
        private String email;
        private String passwort;

        public Professor() {
        }

        public Professor(String name, String email, String passwort) {
            this.name = name;
            this.email = email;
            this.passwort = passwort;
        }

        public Long getId() {return id;}
        public void setId(Long id) {this.id = id;}

        public String getName() {return name;}

        public String getEmail() {return email;}

        public String getPasswort() {return passwort;}

        public void setName(String name) {this.name = name;}

        public void setEmail(String email) {this.email = email;}

        public void setPasswort(String passwort) {this.passwort = passwort;}
}