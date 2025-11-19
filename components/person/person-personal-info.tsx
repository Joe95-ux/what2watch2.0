"use client";

import { TMDBPerson } from "@/lib/tmdb";
import { Calendar, MapPin, Link as LinkIcon, User } from "lucide-react";

interface PersonPersonalInfoProps {
  person: TMDBPerson;
}

export default function PersonPersonalInfo({ person }: PersonPersonalInfoProps) {
  const formatDate = (date: string | null): string | null => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getGender = (gender: number): string => {
    switch (gender) {
      case 1:
        return "Female";
      case 2:
        return "Male";
      case 3:
        return "Non-binary";
      default:
        return "Not specified";
    }
  };

  const calculateAge = (birthday: string | null, deathday: string | null): number | null => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const end = deathday ? new Date(deathday) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(person.birthday, person.deathday);
  const birthdayFormatted = formatDate(person.birthday);
  const deathdayFormatted = formatDate(person.deathday);

  const infoItems = [
    { label: "Known For", value: person.known_for_department },
    { label: "Gender", value: getGender(person.gender) },
    { label: "Birthday", value: birthdayFormatted },
    { label: "Place of Birth", value: person.place_of_birth },
    { label: "Age", value: age !== null ? `${age} years${person.deathday ? " (at death)" : ""}` : null },
    { label: "Deathday", value: deathdayFormatted },
    { label: "Homepage", value: person.homepage, isLink: true },
    { label: "IMDb", value: person.imdb_id ? `https://www.imdb.com/name/${person.imdb_id}` : null, isLink: true },
  ].filter((item) => item.value !== null && item.value !== undefined && item.value !== "");

  if (infoItems.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-6">Personal Information</h2>
      <div className="border border-border rounded-lg divide-y divide-border">
        {infoItems.map((item, index) => (
          <div key={index} className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
            {item.isLink ? (
              <a
                href={item.value as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" />
                {item.label === "Homepage" ? "Visit Website" : "View on IMDb"}
              </a>
            ) : (
              <span className="text-sm text-foreground text-right">{item.value as string}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

