package com.example.demo.model;

import jakarta.persistence.*;

    @Entity
    @Table(name = "Notenschluessel")
    public class Notenschluessel {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @OneToOne
        @JoinColumn(name = "pruefung_id")
        private Pruefung pruefung;

        private boolean istStandard;

        // Notenstufen als JSON gespeichert
        @Column(columnDefinition = "TEXT")
        private String stufen;


        public Notenschluessel() {}

        public Notenschluessel(Pruefung pruefung, boolean istStandard, String stufen) {
            this.pruefung = pruefung;
            this.istStandard = istStandard;
            this.stufen = stufen;
        }


        public Long getId() { return id; }

        public Pruefung getPruefung() { return pruefung; }
        public void setPruefung(Pruefung pruefung) {this.pruefung = pruefung;}

        public boolean isIstStandard() { return istStandard; }
        public void setIstStandard(boolean istStandard) {this.istStandard = istStandard;}

        public String getStufen() { return stufen; }
        public void setStufen(String stufen) {this.stufen = stufen;}
    }

