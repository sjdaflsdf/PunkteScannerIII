package com.example.demo.controller;

import com.example.demo.model.Pruefung;
import com.example.demo.service.PruefungService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

    @RestController
    @RequestMapping("/api/pruefungen")
    public class PruefungController {

        @Autowired
        private PruefungService pruefungService;

        // Alle Prüfungen laden
        @GetMapping
        public ResponseEntity<List<Pruefung>> getAllPruefungen() {
            List<Pruefung> pruefungen = pruefungService.getAllPruefungen();
            return ResponseEntity.ok(pruefungen);
        }

        // Eine Prüfung laden
        @GetMapping("/{id}")
        public ResponseEntity<Pruefung> getPruefungById(@PathVariable Long id) {
            return pruefungService.getPruefungById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        // Prüfungen eines Professors laden
        @GetMapping("/professor/{professorId}")
        public ResponseEntity<List<Pruefung>> getPruefungenByProfessor(
                @PathVariable Long professorId) {
            List<Pruefung> pruefungen =
                    pruefungService.getPruefungenByProfessor(professorId);
            return ResponseEntity.ok(pruefungen);
        }

        // Neue Prüfung erstellen
        @PostMapping
        public ResponseEntity<Pruefung> createPruefung(
                @RequestBody Pruefung pruefung) {
            Pruefung neu = pruefungService.createPruefung(pruefung);
            return ResponseEntity.status(HttpStatus.CREATED).body(neu);
        }

        // Prüfung bearbeiten
        @PutMapping("/{id}")
        public ResponseEntity<Pruefung> updatePruefung(
                @PathVariable Long id,
                @RequestBody Pruefung pruefung) {
            Pruefung aktualisiert = pruefungService.updatePruefung(id, pruefung);
            return ResponseEntity.ok(aktualisiert);
        }

        // Prüfung löschen
        @DeleteMapping("/{id}")
        public ResponseEntity<Void> deletePruefung(@PathVariable Long id) {
            pruefungService.deletePruefung(id);
            return ResponseEntity.noContent().build();
        }
    }

