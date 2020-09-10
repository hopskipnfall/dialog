import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DetailRoutingModule } from './detail/detail-routing.module';
import { HomeRoutingModule } from './home/home-routing.module';
import { PageNotFoundComponent } from './shared/components';
import { WizardComponent } from './wizard/wizard.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'wizard',
    component: WizardComponent,
  },
  {
    path: '**',
    component: PageNotFoundComponent,
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
    HomeRoutingModule,
    DetailRoutingModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
