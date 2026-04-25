package com.example.demo.controller;

import com.example.demo.model.Ergebnis;
import com.example.demo.repository.ErgebnisRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

    @RestController
    @RequestMapping("/api/export")
    public class ExportController {

        @Autowired
        private ErgebnisRepository ergebnisRepository;

        // CSV Export
        @GetMapping("/csv/{pruefungId}")
        public ResponseEntity<byte[]> exportCsv(
                @PathVariable Long pruefungId) {

            List<Ergebnis> ergebnisse =
                    ergebnisRepository.findByPruefungId(pruefungId);

            StringBuilder csv = new StringBuilder();
            csv.append("Matrikel-Nr,Gesamtpunkte,Note\n");

            for (Ergebnis e : ergebnisse) {
                csv.append(e.getStudent().getMatNr()).append(",")
                        .append(e.getGesamtPunkte()).append(",")
                        .append(e.getNote()).append("\n");
            }

            byte[] bytes = csv.toString().getBytes();

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=ergebnisse.csv")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(bytes);
        }
    }

