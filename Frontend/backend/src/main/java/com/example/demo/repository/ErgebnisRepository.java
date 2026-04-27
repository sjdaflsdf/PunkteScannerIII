package com.example.demo.repository;


import com.example.demo.model.Ergebnis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

    @Repository
    public interface ErgebnisRepository
            extends JpaRepository<Ergebnis, Long> {

        List<Ergebnis> findByPruefungId(Long pruefungId);
        List<Ergebnis> findByStudentId(Long studentId);
    }

