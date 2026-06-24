package com.example.backend.repository;

import com.example.backend.dto.response.HotelSummaryResponse;
import com.example.backend.entity.Hotel;
import com.example.backend.enums.HotelStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Long> {

    Page<Hotel> findByStatusAndDeletedAtIsNull(HotelStatus status, Pageable pageable);

    Page<Hotel> findByOwner_EmailAndDeletedAtIsNull(String email, Pageable pageable);

    boolean existsByEmail(String email);

    Page<Hotel> findByDeletedAtIsNotNull(Pageable pageable);

    Page<Hotel> findByDeletedAtIsNull(Pageable pageable);

    @Query("""
            SELECT new com.example.backend.dto.response.HotelSummaryResponse(
                h.id,
                h.hotelName,
                h.starRating,
                h.district,
                h.city,
                MIN(roomPrice.totalPrice),
                h.status,
                (
                    SELECT img.imageUrl
                    FROM HotelImage img
                    WHERE img.hotel.id = h.id
                    AND img.isPrimary = true
                )
            )
            FROM Hotel h
            JOIN (
                SELECT
                    rt.id as roomTypeId,
                    rt.hotel.id as hotelId,
                    SUM(rc.price)/ :nights as totalPrice
                FROM RoomType rt
                JOIN RoomCalendar rc ON rc.roomType.id = rt.id
                WHERE
                    rt.isActive = true
                    AND rt.deletedAt IS NULL
                    AND rc.isAvailable = true
                    AND (rc.totalRooms - rc.bookedRooms) > 0
                    AND rc.date >= :checkIn
                    AND rc.date < :checkOut
                    AND rt.maxAdults >= :adults
                    AND (rt.maxAdults + COALESCE(rt.maxChildren,0)) >= (:adults + :children)
                    AND ('_ALL_' IN :bedTypes OR LOWER(rt.bedType) IN :bedTypes)
                    AND (:roomAmenitiesSize = 0 OR rt.id IN (
                        SELECT rta2.roomType.id
                        FROM RoomTypeAmenity rta2
                        WHERE rta2.amenity.id IN :roomAmenities
                        GROUP BY rta2.roomType.id
                        HAVING COUNT(DISTINCT rta2.amenity.id) = :roomAmenitiesSize
                    ))
                GROUP BY rt.id, rt.hotel.id
                HAVING COUNT(DISTINCT rc.date) = :nights
            ) roomPrice ON roomPrice.hotelId = h.id
            WHERE
                h.status = com.example.backend.enums.HotelStatus.APPROVED
                AND h.deletedAt IS NULL
                AND ('_ALL_' IN :districts OR h.district IN :districts)
                AND (:keyword = ''
                     OR LOWER(h.hotelName) LIKE :keyword
                     OR LOWER(h.addressLine) LIKE :keyword)
                AND (-1 IN :stars OR FUNCTION('floor', h.starRating) IN :stars)
                AND (:hotelAmenitiesSize = 0 OR (
                    SELECT COUNT(DISTINCT ha2.amenity.id)
                    FROM HotelAmenity ha2
                    WHERE ha2.hotel.id = h.id
                      AND ha2.amenity.type = com.example.backend.enums.AmenityType.HOTEL
                      AND ha2.amenity.id IN :hotelAmenities
                ) = :hotelAmenitiesSize)
            GROUP BY
                h.id, h.hotelName, h.starRating, h.district, h.city, h.status
            HAVING
                (:minPrice < 0 OR MIN(roomPrice.totalPrice) >= :minPrice)
                AND (:maxPrice < 0 OR MIN(roomPrice.totalPrice) <= :maxPrice)
            ORDER BY
                CASE WHEN :sortBy='price_asc' THEN MIN(roomPrice.totalPrice) END ASC,
                CASE WHEN :sortBy='price_desc' THEN MIN(roomPrice.totalPrice) END DESC,
                CASE WHEN :sortBy='star_desc' THEN h.starRating END DESC
            """)
    Page<HotelSummaryResponse> searchHotelsWithFilters(
            @Param("districts") List<String> districts,
            @Param("keyword") String keyword,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            @Param("nights") Long nights,
            @Param("adults") Integer adults,
            @Param("children") Integer children,
            @Param("stars") List<Integer> stars,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("hotelAmenities") List<Long> hotelAmenities,
            @Param("hotelAmenitiesSize") Integer hotelAmenitiesSize,
            @Param("roomAmenities") List<Long> roomAmenities,
            @Param("roomAmenitiesSize") Integer roomAmenitiesSize,
            @Param("bedTypes") List<String> bedTypes,
            @Param("sortBy") String sortBy,
            Pageable pageable);

    @Query("""
                SELECT h.owner.email FROM Hotel h
                WHERE h.id = :id
            """)
    String findOwnerEmailByHotelId(@Param("id") Long id);

    @Query("SELECT h FROM Hotel h LEFT JOIN FETCH h.roomTypes WHERE h.id = :id")
    Optional<Hotel> findByIdWithRoomTypes(@Param("id") Long id);

    @Query("""
            SELECT h
            FROM Hotel h
            WHERE h.deletedAt IS NULL
            AND (
                :keyword IS NULL
                OR LOWER(h.hotelName) LIKE :keyword
                OR LOWER(h.email) LIKE :keyword
                OR LOWER(h.district) LIKE :keyword
                OR LOWER(h.owner.email) LIKE :keyword
            )
            AND (
                :status IS NULL
                OR h.status = :status
            )
            """)
    Page<Hotel> findAdminWithFilter(
            @Param("keyword") String keyword,
            @Param("status") HotelStatus status,
            Pageable pageable);

    @Query("""
            SELECT h
            FROM Hotel h
            WHERE h.deletedAt IS NULL
            AND h.owner.email = :ownerEmail
            AND (
                :keyword IS NULL
                OR LOWER(h.hotelName) LIKE :keyword
                OR LOWER(h.email) LIKE :keyword
                OR LOWER(h.district) LIKE :keyword
            )
            AND (
                :status IS NULL
                OR h.status = :status
            )
            """)
    Page<Hotel> findOwnerWithFilter(
            @Param("ownerEmail") String ownerEmail,
            @Param("keyword") String keyword,
            @Param("status") HotelStatus status,
            Pageable pageable);

}