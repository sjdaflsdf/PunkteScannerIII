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
    private int maxPunkte;
    private String status;
    private double bestehenAb = 50.0; // NEU – Standard 50%


    public Pruefung(){

    }

    public Pruefung(Professor professor, String name, LocalDate datum, int maxPunkte, String status, double bestehenAb){
        this.professor=professor;
        this.name=name;
        this.datum=datum;
        this.maxPunkte=maxPunkte;
        this.status=status;
        this.bestehenAb=bestehenAb;

    }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {this.id = id;}

    public Professor getProfessor() {return professor;}

    public void setProfessor(Professor professor) {this.professor = professor;}

    public String getName() {return name;}

    public void setName(String name) {this.name = name;}

    public LocalDate getDatum() {return datum;}

    public void setDatum(LocalDate datum) {this.datum = datum;}

    public int getMaxPunkte() {return maxPunkte;}

    public void setMaxPunkte(int max_punkte) {this.maxPunkte = maxPunkte;}

    public String getStatus() {return status;}

    public void setStatus(String status) {this.status = status;}

    public double getBestehenAb() {return bestehenAb;}

    public void setBestehenAb(double bestehenAb) {this.bestehenAb = bestehenAb;}
}
