package com.example.demo.repository;

import com.example.demo.model.Professor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

    @Repository
    public interface ProfessorRepository
            extends JpaRepository<Professor, Long> {

        Professor findByEmail(String email);
    }

