package com.example.demo.service;
import com.example.demo.model.Pruefung;
import com.example.demo.repository.PruefungRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

    @Service
    public class PruefungService {

        @Autowired
        private PruefungRepository pruefungRepository;

        // Alle Prüfungen laden
        public List<Pruefung> getAllPruefungen() {
            return pruefungRepository.findAll();
        }

        // Eine Prüfung laden
        public Optional<Pruefung> getPruefungById(Long id) {
            return pruefungRepository.findById(id);
        }

        // Prüfungen eines Professors laden
        public List<Pruefung> getPruefungenByProfessor(Long professorId) {
            return pruefungRepository.findByProfessorId(professorId);
        }

        // Neue Prüfung erstellen
        public Pruefung createPruefung(Pruefung pruefung) {
            pruefung.setStatus("ENTWURF");
            Pruefung gespeichert = pruefungRepository.save(pruefung);
            return pruefungRepository.findById(gespeichert.getId()).orElseThrow();
        }

        // Prüfung bearbeiten
        public Pruefung updatePruefung(Long id, Pruefung pruefung) {
            pruefung.setId(id);
            return pruefungRepository.save(pruefung);
        }

        // Prüfung löschen
        public void deletePruefung(Long id) {
            pruefungRepository.deleteById(id);
        }
    }

