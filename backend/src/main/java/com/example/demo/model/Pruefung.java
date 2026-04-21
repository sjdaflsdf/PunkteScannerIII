package com.example.demo.model;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table (name="Pruefung")

public class Pruefung {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JoinColumn(name="professor_id")
    private Professor professor;
    private String name;
    private LocalDate datum;
    private int max_punkte;
    private String status;
    private double bestehenAb = 50.0; // NEU – Standard 50%


    public Pruefung(){

    }

    public Pruefung(Professor professor, String name, LocalDate datum, int max_punkte, String status, double bestehenAb){
        this.professor=professor;
        this.name=name;
        this.datum=datum;
        this.max_punkte=max_punkte;
        this.status=status;
        this.bestehenAb=bestehenAb;

    }

    public Long getId() {
        return id;
    }

    public Professor getProfessor() {return professor;}

    public void setProfessor(Professor professor) {this.professor = professor;}

    public String getName() {return name;}

    public void setName(String name) {this.name = name;}

    public LocalDate getDatum() {return datum;}

    public void setDatum(LocalDate datum) {this.datum = datum;}

    public int getMax_punkte() {return max_punkte;}

    public void setMax_punkte(int max_punkte) {this.max_punkte = max_punkte;}

    public String getStatus() {return status;}

    public void setStatus(String status) {this.status = status;}

    public double getBestehenAb() {return bestehenAb;}

    public void setBestehenAb(double bestehenAb) {this.bestehenAb = bestehenAb;}
}
