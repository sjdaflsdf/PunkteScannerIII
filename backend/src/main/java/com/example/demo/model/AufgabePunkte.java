package com.example.demo.model;


import jakarta.persistence.*;

@Entity
@Table(name = "Aufgabe_punkte")
public class AufgabePunkte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "ergebnis_id")
    private Ergebnis ergebnis;

    @ManyToOne
    @JoinColumn(name = "aufgabe_id")
    private Aufgabe aufgabe;

    private double punkte;

    public AufgabePunkte() {}

    public AufgabePunkte(Ergebnis ergebnis, Aufgabe aufgabe, double punkte) {
        this.ergebnis = ergebnis;
        this.aufgabe = aufgabe;
        this.punkte = punkte;
    }


    public Long getId() { return id; }

    public Ergebnis getErgebnis() { return ergebnis; }
    public void setErgebnis(Ergebnis ergebnis) {this.ergebnis = ergebnis;}

    public Aufgabe getAufgabe() { return aufgabe; }
    public void setAufgabe(Aufgabe aufgabe) {this.aufgabe = aufgabe;}

    public double getPunkte() { return punkte; }
    public void setPunkte(double punkte) {this.punkte = punkte;}
}


