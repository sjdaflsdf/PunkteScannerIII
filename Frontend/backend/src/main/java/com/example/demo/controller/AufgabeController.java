package com.example.demo.controller;

import com.example.demo.model.Aufgabe;
import com.example.demo.repository.AufgabeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

    @RestController
    @RequestMapping("/api/aufgaben")
    public class AufgabeController {

        @Autowired
        private AufgabeRepository aufgabeRepository;

        // Alle Aufgaben einer Prüfung laden
        @GetMapping("/pruefung/{pruefungId}")
        public ResponseEntity<List<Aufgabe>> getAufgabenByPruefung(
                @PathVariable Long pruefungId) {
            List<Aufgabe> aufgaben =
                    aufgabeRepository.findByPruefungId(pruefungId);
            return ResponseEntity.ok(aufgaben);
        }

        // Eine Aufgabe laden
        @GetMapping("/{id}")
        public ResponseEntity<Aufgabe> getAufgabeById(
                @PathVariable Long id) {
            return aufgabeRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        // Neue Aufgabe erstellen
        @PostMapping
        public ResponseEntity<Aufgabe> createAufgabe(
                @RequestBody Aufgabe aufgabe) {
            Aufgabe neu = aufgabeRepository.save(aufgabe);
            return ResponseEntity.status(HttpStatus.CREATED).body(neu);
        }

        // Aufgabe löschen
        @DeleteMapping("/{id}")
        public ResponseEntity<Void> deleteAufgabe(
                @PathVariable Long id) {
            aufgabeRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
    }

