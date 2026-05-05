package com.example.demo.controller;

import com.example.demo.model.Professor;
import com.example.demo.repository.ProfessorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

    @RestController
    @RequestMapping("/api/professoren")
    public class ProfessorController {

        @Autowired
        private ProfessorRepository professorRepository;

        // Professor registrieren
        @PostMapping("/registrieren")
        public ResponseEntity<Professor> registrieren(
                @RequestBody Professor professor) {
            Professor neu = professorRepository.save(professor);
            return ResponseEntity.status(HttpStatus.CREATED).body(neu);
        }

        // Professor laden
        @GetMapping("/{id}")
        public ResponseEntity<Professor> getProfessorById(
                @PathVariable Long id) {
            return professorRepository.findById(id)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        }

        // Professor per Email suchen (für Login)
        @GetMapping("/email/{email}")
        public ResponseEntity<Professor> getProfessorByEmail(
                @PathVariable String email) {
            Professor professor = professorRepository.findByEmail(email);
            if (professor == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(professor);
        }
    }

