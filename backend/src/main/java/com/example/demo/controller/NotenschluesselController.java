package com.example.demo.controller;

import com.example.demo.repository.NotenschluesselRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notenschluessel")
public class NotenschluesselController {

    @Autowired
    private NotenschluesselRepository notenschluesselRepository;

    // Standard-Notenschlüssel abrufen (bestehender Endpunkt)
    @GetMapping
    public ResponseEntity<?> getStandard() {
        return notenschluesselRepository.findByIstStandardTrue()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }


}
