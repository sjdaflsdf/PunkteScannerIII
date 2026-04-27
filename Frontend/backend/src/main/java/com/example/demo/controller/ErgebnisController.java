package com.example.demo.controller;

import com.example.demo.model.Ergebnis;
import com.example.demo.repository.ErgebnisRepository;
import com.example.demo.repository.PruefungRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

    @RestController
    @RequestMapping("/api/ergebnisse")
    public class ErgebnisController {

        @Autowired
        private ErgebnisRepository ergebnisRepository;

        @Autowired
        private PruefungRepository pruefungRepository;

        // Alle Ergebnisse einer Prüfung laden
        @GetMapping("/pruefung/{pruefungId}")
        public ResponseEntity<List<Ergebnis>> getErgebnisseByPruefung(
                @PathVariable Long pruefungId) {
            List<Ergebnis> ergebnisse =
                    ergebnisRepository.findByPruefungId(pruefungId);
            return ResponseEntity.ok(ergebnisse);
        }

        // Ein Ergebnis laden
        @GetMapping("/{id}")
        public ResponseEntity<Ergebnis> getErgebnisById(
                @PathVariable Long id) {
            return ergebnisRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        // Neues Ergebnis erstellen
        @PostMapping
        public ResponseEntity<Ergebnis> createErgebnis(
                @RequestBody Ergebnis ergebnis) {
            Ergebnis neu = ergebnisRepository.save(ergebnis);
            return ResponseEntity.status(HttpStatus.CREATED).body(neu);
        }

        // Ergebnis löschen
        @DeleteMapping("/{id}")
        public ResponseEntity<Void> deleteErgebnis(
                @PathVariable Long id) {
            ergebnisRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
    }

