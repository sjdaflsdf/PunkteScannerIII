package com.example.demo.model;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

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

        @OneToMany(mappedBy = "notenschluessel", cascade = CascadeType.ALL, orphanRemoval = true)
        private List<Notenstufe> stufen = new ArrayList<>();


        public Notenschluessel() {}

        public Notenschluessel(Pruefung pruefung, boolean istStandard, List<Notenstufe> stufen) {
            this.pruefung = pruefung;
            this.istStandard = istStandard;
            this.stufen = stufen;
        }


        public Long getId() { return id; }

        public Pruefung getPruefung() { return pruefung; }
        public void setPruefung(Pruefung pruefung) {this.pruefung = pruefung;}

        public boolean isIstStandard() { return istStandard; }
        public void setIstStandard(boolean istStandard) {this.istStandard = istStandard;}

        public List<Notenstufe> getStufen() { return stufen; }
        public void setStufen(List<Notenstufe> stufen) {this.stufen = stufen;}
    }

