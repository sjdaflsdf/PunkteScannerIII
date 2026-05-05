package com.example.demo;

import org.springframework.boot.*;
import org.springframework.boot.autoconfigure.*;
import org.springframework.web.bind.annotation.*;


@SpringBootApplication
@RestController
public class DemoApplication {
	@GetMapping("/")
	public String home() {
		return "Spring is here!";
	}

	@GetMapping("/test")
	public String test() {
		return "hallo Hans";
}

	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}
}
