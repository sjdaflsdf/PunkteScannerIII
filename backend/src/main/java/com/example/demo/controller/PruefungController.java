package com.example.demo.controller;

import com.example.demo.model.Notenschluessel;
import com.example.demo.model.NotenschluesselDefaults;
import com.example.demo.model.Notenstufe;
import com.example.demo.model.Pruefung;
import com.example.demo.repository.NotenschluesselRepository;
import com.example.demo.repository.PruefungRepository;
import com.example.demo.service.PruefungService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pruefungen")
public class PruefungController {

        @Autowired
        private PruefungService pruefungService;

    @Autowired
    private NotenschluesselRepository notenschluesselRepository;

    @Autowired
    private PruefungRepository pruefungRepository;

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

    // Notenschlüssel einer Prüfung abrufen (mit Standard-Fallback)
    @GetMapping("/{pruefungId}/notenschluessel")
    public ResponseEntity<?> getByPruefung(@PathVariable Long pruefungId) {
        Map<String, Object> result = new HashMap<>();
        Notenschluessel ns = notenschluesselRepository.findByPruefungId(pruefungId).orElse(null);
        if (ns != null) {
            result.put("id", ns.getId());
            result.put("istStandard", ns.isIstStandard());
            result.put("stufen", ns.getStufen().stream().map(s -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("note", s.getNote());
                m.put("schwelle", s.getSchwelle());
                m.put("color", s.getColor());
                return m;
            }).collect(Collectors.toList()));
        } else {
            result.put("id", null);
            result.put("istStandard", true);
            result.put("stufen", NotenschluesselDefaults.getDefaultStufen());
        }
        return ResponseEntity.ok(result);
    }

    // Notenschlüssel für eine Prüfung speichern / aktualisieren
    @PutMapping("/{pruefungId}/notenschluessel")
    public ResponseEntity<?> saveByPruefung(
            @PathVariable Long pruefungId,
            @RequestBody List<Map<String, Object>> stufen) {

        Pruefung pruefung = pruefungRepository.findById(pruefungId).orElse(null);
        if (pruefung == null) return ResponseEntity.notFound().build();

        Notenschluessel ns = notenschluesselRepository.findByPruefungId(pruefungId)
                .orElse(new Notenschluessel());
        ns.setPruefung(pruefung);
        ns.setIstStandard(false);

        ns.getStufen().clear();
        for (Map<String, Object> stufe : stufen) {
            ns.getStufen().add(new Notenstufe(
                    String.valueOf(stufe.get("note")),
                    Double.parseDouble(String.valueOf(stufe.get("schwelle"))),
                    String.valueOf(stufe.get("color")),
                    ns
            ));
        }
        notenschluesselRepository.save(ns);

        Map<String, Object> result = new HashMap<>();
        result.put("id", ns.getId());
        result.put("istStandard", false);
        result.put("stufen", stufen);
        return ResponseEntity.ok(result);
    }
    }

