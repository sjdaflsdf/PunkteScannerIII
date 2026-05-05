package com.example.demo.repository;

import com.example.demo.model.Notenschluessel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

    @Repository
    public interface NotenschluesselRepository
            extends JpaRepository<Notenschluessel, Long> {

        Optional<Notenschluessel> findByPruefungId(Long pruefungId);
        Optional<Notenschluessel> findByIstStandardTrue();
    }

