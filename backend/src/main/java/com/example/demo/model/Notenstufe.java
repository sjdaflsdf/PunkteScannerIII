package com.example.demo.model;

import jakarta.persistence.*;

@Entity
@Table(name = "notenstufe")
public class Notenstufe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String note;
    private double schwelle;
    private String color;

    @ManyToOne
    @JoinColumn(name = "notenschluessel_id")
    private Notenschluessel notenschluessel;

    public Notenstufe() {}

    public Notenstufe(String note, double schwelle, String color, Notenschluessel notenschluessel) {
        this.note = note;
        this.schwelle = schwelle;
        this.color = color;
        this.notenschluessel = notenschluessel;
    }

    public Long getId() { return id; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public double getSchwelle() { return schwelle; }
    public void setSchwelle(double schwelle) { this.schwelle = schwelle; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Notenschluessel getNotenschluessel() { return notenschluessel; }
    public void setNotenschluessel(Notenschluessel notenschluessel) { this.notenschluessel = notenschluessel; }
}
