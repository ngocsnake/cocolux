import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ChatMessage } from 'src/app/common/ChatMessage';
import { Customer } from 'src/app/common/Customer';
import { Notification } from 'src/app/common/Notification';
import { Order } from 'src/app/common/Order';
import { CustomerService } from 'src/app/services/customer.service';
import { NotificationService } from 'src/app/services/notification.service';
import { OrderService } from 'src/app/services/order.service';
import { SessionService } from 'src/app/services/session.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { UploadService } from 'src/app/services/upload.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  customer!: any;
  orders!: Order[];
  page: number = 1;

  done!: number;
  updating = false;

  constructor(
    private customerService: CustomerService,
    private toastr: ToastrService,
    private sessionService: SessionService,
    private router: Router,
    private orderService: OrderService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private uploadService: UploadService
  ) {

  }

  ngOnInit(): void {
    this.webSocketService.openWebSocket();
    this.router.events.subscribe((evt) => {
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0)
    });
    this.getCustomer();
    this.getOrder();
  }

  ngOnDestroy(): void {
    this.webSocketService.closeWebSocket();
  }

  getCustomer() {
    let email = this.sessionService.getUser();
    this.customerService.getByEmail(email).subscribe(data => {
      this.customer = data as Customer;
    }, error => {
      this.toastr.error('Lỗi thông tin', 'Hệ thống')
      window.location.href = ('/');
    })
  }

  getOrder() {
    let email = this.sessionService.getUser();
    this.orderService.get(email).subscribe(data => {
      this.orders = data as Order[];
      this.done = 0;
      this.orders.forEach(o => {
        if (o.status === 2) {
          this.done += 1
        }
      })
    }, error => {
      this.toastr.error('Lỗi server', 'Hệ thống');
    })
  }

  cancel(id: number) {
    if (id === -1) {
      return;
    }
    Swal.fire({
      title: 'Bạn có muốn huỷ đơn hàng này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Không',
      confirmButtonText: 'Huỷ'
    }).then((result) => {
      if (result.isConfirmed) {
        this.orderService.cancel(id).subscribe(data => {
          this.getOrder();
          this.sendMessage(id);
          this.toastr.success('Huỷ đơn hàng thành công!', 'Hệ thống');
        }, error => {
          this.toastr.error('Lỗi server', 'Hệ thống');
        })
      }
    })

  }

  sendMessage(id: number) {
    let chatMessage = new ChatMessage(this.customer.name, ' đã huỷ một đơn hàng');
    this.notificationService.post(new Notification(0, this.customer.name + ' đã huỷ một đơn hàng (' + id + ')')).subscribe(data => {
      this.webSocketService.sendMessage(chatMessage);
    })
  }

  finish() {
    this.ngOnInit();
  }

  fileChange(event: any) {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];

      const reader = new FileReader();
      reader.onload = e => this.customer.imageBlob = reader.result;

      reader.readAsDataURL(file);
    }
  }

  updateCustomer() {
    this.updating = true
    if (this.customer.imageBlob) {
      this.uploadService.uploadCustomer(this.customer.imageBlob).subscribe(response => {
        if (response) {
          this.customer.image = response.secure_url;
          this.customerService.update(this.customer.userId, this.customer).subscribe(response => {
            if (response) {
              this.toastr.success("Cập nhật thông tin thành công!")
            } else {
              this.toastr.success("Có lỗi xảy ra!")
            }
            this.updating = false
          })
        }
      })
    } else {
      this.customerService.update(this.customer.userId, this.customer).subscribe(response => {
        if (response) {
          this.toastr.success("Cập nhật thông tin thành công!")
        } else {
          this.toastr.success("Có lỗi xảy ra!")
        }
        this.updating = false
      })
    }
  }

}
