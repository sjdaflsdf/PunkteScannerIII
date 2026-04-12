package com.example.demo.controller;

import com.example.demo.model.Produkt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("products")
public class ProduktController {

    @GetMapping
    public Produkt produkt(@RequestParam("name") String name) {
        return new Produkt(name, 3000);
    }
}