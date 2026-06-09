package com.example.demo.controller;

import com.example.demo.model.Notenschluessel;
import com.example.demo.model.Pruefung;
import com.example.demo.repository.NotenschluesselRepository;
import com.example.demo.repository.PruefungRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notenschluessel")
public class NotenschluesselController {

    @Autowired
    private NotenschluesselRepository notenschluesselRepository;

    @Autowired
    private PruefungRepository pruefungRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Standard-Notenschlüssel abrufen (bestehender Endpunkt)
    @GetMapping
    public ResponseEntity<?> getStandard() {
        return notenschluesselRepository.findByIstStandardTrue()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Notenschlüssel einer Prüfung abrufen
    @GetMapping("/pruefung/{pruefungId}")
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
    @PutMapping("/pruefung/{pruefungId}")
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
