package com.example.demo.model;

import jakarta.persistence.*;

    @Entity
    @Table (name="Student")
    public class Student {
    @Id
    @GeneratedValue (strategy = GenerationType.IDENTITY)

    private long id;
    private String matNr;
    private String name;
    public Student (){
    }

    public Student(String matNr){
        this.matNr=matNr;
    }

    public long getId() {
        return id;
    }

    public String getMatNr() {
        return matNr;
    }

    public void setMatNr(String matNr) {
        this.matNr = matNr;
    }

    public String getName() {
         return name;
    }
    
    public void setName(String name) { 
        this.name = name; 
    }
}
