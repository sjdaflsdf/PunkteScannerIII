package com.example.demo.controller;

import com.example.demo.model.Notenschluessel;
import com.example.demo.model.NotenschluesselDefaults;
import com.example.demo.repository.NotenschluesselRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notenschluessel")
public class NotenschluesselController {

    @Autowired
    private NotenschluesselRepository notenschluesselRepository;

    // Standard-Notenschlüssel abrufen (mit Fallback auf Default)
    @GetMapping
    public ResponseEntity<?> getStandard() {
        Notenschluessel ns = notenschluesselRepository.findByIstStandardTrue().orElse(null);
        Map<String, Object> result = new HashMap<>();
        if (ns != null) {
            result.put("id", ns.getId());
            result.put("istStandard", true);
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
}
