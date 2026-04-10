package com.quizcap.repository;

import com.quizcap.model.ChatbotData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatbotDataRepository extends JpaRepository<ChatbotData, Long> {

    List<ChatbotData> findAll();
}
