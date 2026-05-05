package com.example.demo.repository;

import com.example.demo.model.AufgabePunkte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

    @Repository
    public interface AufgabePunkteRepository
            extends JpaRepository<AufgabePunkte, Long> {

        List<AufgabePunkte> findByErgebnisId(Long ergebnisId);
        List<AufgabePunkte> findByAufgabeId(Long aufgabeId);
    }

