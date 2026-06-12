package com.example.demo.controller;

import com.example.demo.model.Notenschluessel;
import com.example.demo.model.Pruefung;
import com.example.demo.repository.NotenschluesselRepository;
import com.example.demo.repository.PruefungRepository;
import com.example.demo.service.PruefungService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pruefungen")
public class PruefungController {

        @Autowired
        private PruefungService pruefungService;

    @Autowired
    private NotenschluesselRepository notenschluesselRepository;

    @Autowired
    private PruefungRepository pruefungRepository;

    @Autowired
    private ObjectMapper objectMapper;

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

    // Notenschlüssel einer Prüfung abrufen
    @GetMapping("/{pruefungId}/notenschluessel")
    public ResponseEntity<?> getByPruefung(@PathVariable Long pruefungId) {
        return notenschluesselRepository.findByPruefungId(pruefungId)
                .map(ns -> {
                    try {
                        Map<String, Object> result = new HashMap<>();
                        result.put("id", ns.getId());
                        result.put("istStandard", ns.isIstStandard());
                        result.put("stufen", objectMapper.readValue(ns.getStufen(), List.class));
                        return ResponseEntity.ok(result);
                    } catch (Exception e) {
                        return ResponseEntity.internalServerError().build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Notenschlüssel für eine Prüfung speichern / aktualisieren
    @PutMapping("/{pruefungId}/notenschluessel")
    public ResponseEntity<?> saveByPruefung(
            @PathVariable Long pruefungId,
            @RequestBody List<Map<String, Object>> stufen) {

        Pruefung pruefung = pruefungRepository.findById(pruefungId).orElse(null);
        if (pruefung == null) return ResponseEntity.notFound().build();

        try {
            String stufenJson = objectMapper.writeValueAsString(stufen);
            Notenschluessel ns = notenschluesselRepository.findByPruefungId(pruefungId)
                    .orElse(new Notenschluessel());
            ns.setPruefung(pruefung);
            ns.setIstStandard(false);
            ns.setStufen(stufenJson);
            notenschluesselRepository.save(ns);

            Map<String, Object> result = new HashMap<>();
            result.put("id", ns.getId());
            result.put("istStandard", false);
            result.put("stufen", stufen);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    }

