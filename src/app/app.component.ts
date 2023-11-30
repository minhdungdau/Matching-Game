import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { map, of, delay, interval, take, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'matching game';
  AMOUNT: number = 12
  TIMECONFIG!: number
  currentInterval!: Subscription

  countriesAndCapitalsObject: { [key: string]: string } = {}

  protected countriesAndCapitalsArray = signal<string[]>([])
  currentChoice = signal<string | null>(null)
  matchedArray = signal<string[]>([])
  wrongArray = signal<string[]>([])
  isLoading = signal<boolean>(false)
  coundown = signal<number>(this.TIMECONFIG)
  displayPopup = signal<boolean>(true)
  message = signal<string>("")

  protected http = inject(HttpClient)
  protected router = inject(Router)

  ngOnInit(): void { }

  fetchData() {
    this.isLoading.set(true)
    this.http.get('https://restcountries.com/v2/all').pipe(map((res: any) => {
      this.isLoading.set(false)
      const datas = this.getRandomItemsFromArray(res, this.AMOUNT)
      // convert to object as {"country" : "capital"}
      datas.map((item) => {
        this.countriesAndCapitalsObject[item.name] = item.capital
      })
      // convert to array
      return Object.entries(this.countriesAndCapitalsObject)
    })).subscribe(res => this.initRandomOrder(res))
  }

  fakeFetchData() {
    const DATASOBJECT = {
      "Vietnam": "Hanoi",
      "China": "Beijing",
      "United States": "Washington, D.C.",
      "France": "Paris",
      "Germany": "Berlin",
      "Japan": "Tokyo",
      "United Kingdom": "London",
      "Italy": "Rome",
      "Brazil": "Brasília",
      "Australia": "Canberra",
      "Canada": "Ottawa",
      "India": "New Delhi",
      "South Korea": "Seoul",
      "Mexico": "Mexico City",
      "Russia": "Moscow",
      "Argentina": "Buenos Aires",
      "Egypt": "Cairo",
      "Saudi Arabia": "Riyadh",
      "Turkey": "Ankara",
      "Thailand": "Bangkok",
      "Indonesia": "Jakarta",
      "Nigeria": "Abuja",
      "Kenya": "Nairobi",
      "Ghana": "Accra",
      "Spain": "Madrid",
      "Greece": "Athens",
      "Norway": "Oslo",
      "Sweden": "Stockholm",
      "Portugal": "Lisbon",
      "Netherlands": "Amsterdam",
      "Belgium": "Brussels",
      "Switzerland": "Bern",
      "Austria": "Vienna",
      "Hungary": "Budapest",
      "Poland": "Warsaw",
      "Czech Republic": "Prague",
      "Denmark": "Copenhagen",
      "Finland": "Helsinki",
      "Ireland": "Dublin",
      "New Zealand": "Wellington",
      "Chile": "Santiago",
      "Peru": "Lima",
      "Colombia": "Bogotá",
      "Venezuela": "Caracas",
      "Iran": "Tehran",
      "Iraq": "Baghdad",
      "South Africa": "Pretoria",
      "Morocco": "Rabat",
    }
    this.countriesAndCapitalsArray.set([])
    this.isLoading.set(true)
    of(DATASOBJECT).pipe(delay(1000)).subscribe((data) => {
      this.isLoading.set(false)
      this.countriesAndCapitalsObject = this.getRandomItemsFromObject(data, this.AMOUNT)
      const convertedArray = Object.entries(this.countriesAndCapitalsObject)
      this.initRandomOrder(convertedArray)
      this.startCoundown()
    })
  }

  initLevel(level: 'hard' | 'easy') {
    switch (level) {
      case 'hard':
        this.AMOUNT = 12
        this.TIMECONFIG = 45
        break;
      case 'easy':
        this.AMOUNT = 2
        this.TIMECONFIG = 60
        break
    }
    this.displayPopup.set(false)
    this.fakeFetchData()
  }

  startCoundown() {
    this.coundown.set(this.TIMECONFIG)
    this.currentInterval = interval(1000).pipe(take(this.TIMECONFIG)).subscribe(() => {
      this.coundown.update(current => current - 1)
      if (this.coundown() === 0) {
        this.message.set("Lose")
        this.displayPopup.set(true)
      }
    })
  }

  initRandomOrder(array: any[]): void {
    const flattenedArray = this.flattenArray(array)
    this.countriesAndCapitalsArray.set(this.shuffleArray(flattenedArray))
    this.matchedArray.set([])
    this.currentChoice.set(null)
  }

  getRandomItemsFromArray(array: Array<any>, amount: number) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, amount);
  }

  getRandomItemsFromObject(obj: any, n: number) {
    const keys = Object.keys(obj);
    const shuffledKeys = keys.sort(() => 0.5 - Math.random());
    const selectedKeys = shuffledKeys.slice(0, n);

    const randomItems: { [key: string]: string } = {};
    selectedKeys.forEach(key => {
      randomItems[key] = obj[key];
    });

    return randomItems;
  }

  shuffleArray(array: Array<string>) {
    let shuffledArray = [...array]; // Create a copy of the original array

    for (let i = shuffledArray.length - 1; i > 0; i--) {
      // Generate a random index between 0 and i
      const randomIndex = Math.floor(Math.random() * (i + 1));

      // Swap elements at randomIndex and i
      [shuffledArray[i], shuffledArray[randomIndex]] = [shuffledArray[randomIndex], shuffledArray[i]];
    }

    return shuffledArray;
  }

  flattenArray(arr: Array<any>): any {
    return arr.reduce((flat, toFlatten) => {
      return flat.concat(Array.isArray(toFlatten) ? this.flattenArray(toFlatten) : toFlatten);
    }, []);
  }

  onClick(item: string) {
    this.checkMatch(item)
    this.checkWinner()
  }

  checkMatch(item: string) {
    if (!this.currentChoice()) {
      this.currentChoice.set(item)
      this.wrongArray.set([])
      return
    }

    const currentSelected = this.currentChoice() as string
    if (currentSelected == this.countriesAndCapitalsObject[item] || item == this.countriesAndCapitalsObject[currentSelected]) {
      this.matchedArray.set([...this.matchedArray(), currentSelected, item])
      this.currentChoice.set(null)
    } else {
      this.wrongArray.set([currentSelected, item])
      this.currentChoice.set(null)
    }
  }

  checkWinner() {
    if (this.matchedArray().length == this.AMOUNT * 2) {
      this.currentInterval.unsubscribe()
      this.coundown.set(0)
      this.message.set("Win")
      this.displayPopup.set(true)
    }
  }
}
