package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name="Aufgabe")

public class Aufgabe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pruefung_id")
    private Pruefung pruefung;

    private int aufgabeNr;
    private int maxPunkte;
    private String bezeichnung;


    public Aufgabe() {}


    public Aufgabe(Pruefung pruefung, int aufgabeNr, int maxPunkte, String bezeichnung) {
        this.pruefung = pruefung;
        this.aufgabeNr = aufgabeNr;
        this.maxPunkte = maxPunkte;
        this.bezeichnung = bezeichnung;
    }

    public Long getId() { return id; }

    public Pruefung getPruefung() { return pruefung; }
    public void setPruefung(Pruefung pruefung) {
        this.pruefung = pruefung;
    }

    public int getAufgabeNr() { return aufgabeNr; }
    public void setAufgabeNr(int aufgabeNr) {
        this.aufgabeNr = aufgabeNr;
    }

    public int getMaxPunkte() { return maxPunkte; }
    public void setMaxPunkte(int maxPunkte) {
        this.maxPunkte = maxPunkte;
    }

    public String getBezeichnung() { return bezeichnung; }
    public void setBezeichnung(String bezeichnung) {
        this.bezeichnung = bezeichnung;
    }
}