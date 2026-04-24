package com.example.demo.controller;

import com.example.demo.model.Student;
import com.example.demo.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

    @RestController
    @RequestMapping("/api/studenten")
    public class StudentController {

        @Autowired
        private StudentRepository studentRepository;

        // Alle Studenten laden
        @GetMapping
        public ResponseEntity<List<Student>> getAllStudenten() {
            return ResponseEntity.ok(studentRepository.findAll());
        }

        // Student per Matrikelnummer suchen
        @GetMapping("/matnr/{matNr}")
        public ResponseEntity<Student> getStudentByMatNr(
                @PathVariable String matNr) {
            Student student = studentRepository.findByMatNr(matNr);
            if (student == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(student);
        }

        // Neuen Student anlegen
        @PostMapping
        public ResponseEntity<Student> createStudent(
                @RequestBody Student student) {
            Student neu = studentRepository.save(student);
            return ResponseEntity.status(HttpStatus.CREATED).body(neu);
        }
    }

