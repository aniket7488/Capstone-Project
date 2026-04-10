package com.quizcap.repository;

import com.quizcap.model.Lesson;
import com.quizcap.model.Result;
import com.quizcap.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ResultRepository extends JpaRepository<Result, Long> {

    List<Result> findByUserOrderBySubmittedAtDesc(User user);

    Optional<Result> findByUserAndLesson(User user, Lesson lesson);

    /** Calculates the average score percentage for a given user. */
    @Query("SELECT AVG(CAST(r.score AS double) / r.maxScore * 100) FROM Result r WHERE r.user = :user")
    Double findAverageScoreByUser(@Param("user") User user);

    long countByUser(User user);
}
