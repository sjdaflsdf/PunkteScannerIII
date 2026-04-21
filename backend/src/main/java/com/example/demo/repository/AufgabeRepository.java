package com.example.demo.repository;


import com.example.demo.model.Aufgabe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

    @Repository
    public interface AufgabeRepository
            extends JpaRepository<Aufgabe, Long> {

        List<Aufgabe> findByPruefungId(Long pruefungId);
    }

