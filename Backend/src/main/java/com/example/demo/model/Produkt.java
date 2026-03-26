package com.example.demo.model;

public class Produkt {
    String name;
    double preis;

    public Produkt(String name, double preis) {
        this.name = name;
        this.preis=preis;
    }

    public String getName() {
        return name;
    }
    public double getPreis(){
        return preis;
    }

}
