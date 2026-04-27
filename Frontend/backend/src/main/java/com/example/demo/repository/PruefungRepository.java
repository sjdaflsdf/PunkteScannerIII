package com.example.demo.repository;

import com.example.demo.model.Pruefung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

    @Repository
    public interface PruefungRepository
            extends JpaRepository<Pruefung, Long> {

        List<Pruefung> findByProfessorId(Long professorId);
    }

