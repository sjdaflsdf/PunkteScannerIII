package com.example.demo.model;

import jakarta.persistence.*;

    @Entity
    @Table(name = "Ergebnis")
    public class Ergebnis {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @ManyToOne
        @JoinColumn(name = "pruefung_id")
        private Pruefung pruefung;

        @ManyToOne
        @JoinColumn(name = "student_id")
        private Student student;

        private double gesamtPunkte;
        private String note;

        public Ergebnis() {}


        public Ergebnis(Pruefung pruefung, Student student, double gesamtPunkte, String note) {
            this.pruefung = pruefung;
            this.student = student;
            this.gesamtPunkte = gesamtPunkte;
            this.note = note;
        }

        public Long getId() { return id; }

        public Pruefung getPruefung() { return pruefung; }
        public void setPruefung(Pruefung pruefung) {this.pruefung = pruefung;}

        public Student getStudent() { return student; }
        public void setStudent(Student student) {this.student = student;}

        public double getGesamtPunkte() { return gesamtPunkte; }
        public void setGesamtPunkte(double gesamtPunkte) {this.gesamtPunkte = gesamtPunkte;}

        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }

